import type {
  VOXChunk,
  VOXFrame,
  VOXModelReference,
  VOXNode,
  VOXSize,
} from "./VOXLoader.ts";
import {
  checkedEnd,
  copyPalette,
  DEFAULT_PALETTE,
  fail,
  readChunkId,
  readDictionary,
  readFrame,
} from "./_VOXLoaderBinary.ts";

interface MutableChunk {
  size: VOXSize;
  data: Uint8Array | undefined;
}

interface ParsedChunkState {
  readonly chunks: MutableChunk[];
  palette: number[];
  nodes: Record<number, VOXNode>;
}

interface ChunkContext {
  readonly view: DataView;
  readonly bytes: Uint8Array;
  readonly contentStart: number;
  readonly contentEnd: number;
  readonly contentSize: number;
  readonly state: ParsedChunkState;
}

interface RangeContext {
  readonly view: DataView;
  readonly bytes: Uint8Array;
  readonly state: ParsedChunkState;
  readonly start: number;
  readonly end: number;
}

/** Parsed chunks, palette, and scene-graph nodes from a VOX asset. */
export interface ParsedVOX {
  /** Decoded voxel model chunks in source order. */
  readonly chunks: readonly VOXChunk[];
  /** Global RGBA palette shared by the decoded model chunks. */
  readonly palette: readonly number[];
  /** Scene-graph nodes keyed by their source node identifiers. */
  readonly nodes: Readonly<Record<number, VOXNode>>;
}

function readByte(data: Uint8Array, offset: number): number {
  const value = data[offset];
  if (value === undefined) fail("voxel record is truncated.");
  return value;
}

function validateChunk(chunk: MutableChunk, index: number): VOXChunk {
  const data = chunk.data;
  if (!data) fail(`model ${index} is missing an XYZI chunk.`);
  const { x, y, z } = chunk.size;
  if (x < 1 || y < 1 || z < 1) fail(`model ${index} has invalid dimensions.`);
  const expected = x * y * z;
  if (!Number.isSafeInteger(expected))
    fail(`model ${index} dimensions are too large.`);
  for (let offset = 0; offset < data.length; offset += 4) {
    const vx = readByte(data, offset);
    const vy = readByte(data, offset + 1);
    const vz = readByte(data, offset + 2);
    const color = readByte(data, offset + 3);
    if (vx >= x || vy >= y || vz >= z || color === 0)
      fail(`model ${index} contains an invalid voxel record.`);
  }
  return { size: chunk.size, data, palette: [] };
}

function lastChunk(state: ParsedChunkState): MutableChunk {
  const chunk = state.chunks.at(-1);
  if (!chunk) fail("XYZI chunk has no preceding SIZE chunk.");
  return chunk;
}

function parseSize(context: ChunkContext): void {
  const { view, contentStart, contentSize, state } = context;
  if (contentSize < 12) fail("SIZE chunk is truncated.");
  state.chunks.push({
    size: {
      x: view.getUint32(contentStart, true),
      y: view.getUint32(contentStart + 4, true),
      z: view.getUint32(contentStart + 8, true),
    },
    data: undefined,
  });
}

function parseXYZI(context: ChunkContext): void {
  const { view, bytes, contentStart, contentSize, state } = context;
  if (contentSize < 4) fail("XYZI chunk has no preceding SIZE chunk.");
  const count = view.getUint32(contentStart, true);
  const byteLength = count * 4;
  if (!Number.isSafeInteger(byteLength) || byteLength > contentSize - 4)
    fail("XYZI voxel payload is truncated.");
  const dataStart = contentStart + 4;
  lastChunk(state).data = bytes.slice(dataStart, dataStart + byteLength);
}

function parseTransform(context: ChunkContext): void {
  const { view, contentStart, contentEnd, contentSize, state } = context;
  if (contentSize < 16) fail("nTRN chunk is truncated.");
  let offset = contentStart + 4;
  const attributes = readDictionary(view, offset, contentEnd);
  offset = attributes.next;
  if (offset + 16 > contentEnd) fail("nTRN transform payload is truncated.");
  const childNodeId = view.getUint32(offset, true);
  offset += 8;
  const layerId = view.getInt32(offset, true);
  offset += 4;
  const numFrames = view.getUint32(offset, true);
  offset += 4;
  const frames: VOXFrame[] = [];
  for (let frameIndex = 0; frameIndex < numFrames; frameIndex++) {
    const frame = readFrame(view, offset, contentEnd);
    frames.push(frame.frame);
    offset = frame.next;
  }
  const nodeId = view.getUint32(contentStart, true);
  state.nodes[nodeId] = {
    type: "transform",
    id: nodeId,
    attributes: attributes.value,
    childNodeId,
    layerId,
    frames,
  };
}

function parseGroup(context: ChunkContext): void {
  const { view, contentStart, contentEnd, contentSize, state } = context;
  if (contentSize < 8) fail("nGRP chunk is truncated.");
  let offset = contentStart;
  const nodeId = view.getUint32(offset, true);
  offset += 4;
  const attributes = readDictionary(view, offset, contentEnd);
  offset = attributes.next;
  if (offset + 4 > contentEnd) fail("nGRP child count is truncated.");
  const count = view.getUint32(offset, true);
  offset += 4;
  if (count > (contentEnd - offset) / 4) fail("nGRP child list is truncated.");
  const childIds: number[] = [];
  for (let child = 0; child < count; child++, offset += 4)
    childIds.push(view.getUint32(offset, true));
  state.nodes[nodeId] = {
    type: "group",
    id: nodeId,
    attributes: attributes.value,
    childIds,
  };
}

function parseShape(context: ChunkContext): void {
  const { view, contentStart, contentEnd, contentSize, state } = context;
  if (contentSize < 8) fail("nSHP chunk is truncated.");
  let offset = contentStart;
  const nodeId = view.getUint32(offset, true);
  offset += 4;
  const attributes = readDictionary(view, offset, contentEnd);
  offset = attributes.next;
  if (offset + 4 > contentEnd) fail("nSHP model count is truncated.");
  const count = view.getUint32(offset, true);
  offset += 4;
  const models: VOXModelReference[] = [];
  for (let model = 0; model < count; model++) {
    if (offset + 4 > contentEnd) fail("nSHP model list is truncated.");
    const modelId = view.getUint32(offset, true);
    offset += 4;
    const modelAttributes = readDictionary(view, offset, contentEnd);
    offset = modelAttributes.next;
    models.push({ modelId, attributes: modelAttributes.value });
  }
  state.nodes[nodeId] = {
    type: "shape",
    id: nodeId,
    attributes: attributes.value,
    models,
  };
}

function parseChunk(id: string, context: ChunkContext): void {
  if (id === "SIZE") parseSize(context);
  else if (id === "XYZI") parseXYZI(context);
  else if (id === "RGBA") {
    context.state.palette = copyPalette(
      context.view,
      context.contentStart,
      context.contentEnd,
    );
  } else if (id === "nTRN") parseTransform(context);
  else if (id === "nGRP") parseGroup(context);
  else if (id === "nSHP") parseShape(context);
}

function parseRange(context: RangeContext): void {
  const { view, bytes, state, start, end } = context;
  let cursor = start;
  while (cursor < end) {
    if (end - cursor < 12) fail("chunk header is truncated.");
    const id = readChunkId(view, cursor, end);
    const contentSize = view.getUint32(cursor + 4, true);
    const childrenSize = view.getUint32(cursor + 8, true);
    const contentStart = cursor + 12;
    const contentEnd = checkedEnd(
      contentStart,
      contentSize,
      end,
      `${id} content`,
    );
    const chunkEnd = checkedEnd(
      contentEnd,
      childrenSize,
      end,
      `${id} children`,
    );
    parseChunk(id, {
      view,
      bytes,
      contentStart,
      contentEnd,
      contentSize,
      state,
    });
    if (childrenSize > 0)
      parseRange({ view, bytes, state, start: contentEnd, end: chunkEnd });
    cursor = chunkEnd;
  }
}

/** Parses a MagicaVoxel VOX 150/200 binary asset.
 *
 * @param input Complete VOX data as an ArrayBuffer or view into one.
 * @returns Decoded model chunks, palette, and scene-graph nodes.
 * @throws {SyntaxError} If the input is truncated, malformed, or unsupported.
 */
export function parseVOX(input: ArrayBuffer | ArrayBufferView): ParsedVOX {
  const bytes =
    input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (bytes.byteLength < 8) fail("file header is truncated.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = new TextDecoder().decode(bytes.subarray(0, 4));
  if (magic !== "VOX ") fail("invalid VOX file magic.");
  const version = view.getUint32(4, true);
  if (version !== 150 && version !== 200)
    fail(`unsupported VOX version ${version}.`);
  const state: ParsedChunkState = {
    chunks: [],
    palette: [...DEFAULT_PALETTE],
    nodes: {},
  };
  parseRange({ view, bytes, state, start: 8, end: bytes.byteLength });
  if (state.chunks.length === 0) fail("file contains no SIZE model chunks.");
  const chunks: VOXChunk[] = [];
  for (let index = 0; index < state.chunks.length; index++) {
    const stateChunk = state.chunks[index];
    if (!stateChunk) fail(`model ${index} is missing.`);
    const validated = validateChunk(stateChunk, index);
    chunks.push({
      size: validated.size,
      data: validated.data,
      palette: state.palette,
    });
  }
  return { chunks, nodes: state.nodes, palette: state.palette };
}
