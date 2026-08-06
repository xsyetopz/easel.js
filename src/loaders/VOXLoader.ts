import type { Node } from "../core/Node.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LambertMaterial } from "../materials/LambertMaterial.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Group } from "../objects/Group.ts";
import { Mesh } from "../objects/Mesh.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

/** Integer dimensions of a MagicaVoxel model in source voxel coordinates. */
export interface VOXSize {
  /** Number of voxels along the source X axis. */
  readonly x: number;
  /** Number of voxels along the source Y axis. */
  readonly y: number;
  /** Number of voxels along the source Z axis. */
  readonly z: number;
}

/** Source translation stored by a VOX transform frame. */
export interface VOXTranslation {
  /** Source X translation. */
  readonly x: number;
  /** Source Y translation. */
  readonly y: number;
  /** Source Z translation. */
  readonly z: number;
}

/** One animation/static transform frame from an nTRN node. */
export interface VOXFrame {
  /** Rotation converted to the EASEL Y-up coordinate system. */
  readonly rotation: Matrix4 | undefined;
  /** Translation in VOX coordinates, before Y-up conversion. */
  readonly translation: VOXTranslation | undefined;
  /** Source frame attributes copied from the VOX dictionary. */
  readonly attributes: Readonly<Record<string, string>>;
}

/** CPU voxel model chunk decoded from a SIZE/XYZI pair. */
export interface VOXChunk {
  /** Model dimensions in source X/Y/Z order. */
  readonly size: VOXSize;
  /** Packed voxel records, four bytes per voxel: x, y, z, palette index. */
  readonly data: Uint8Array;
  /** Palette entries packed as 0xAABBGGRR, indexed by voxel color. */
  readonly palette: readonly number[];
}

/** Transform node in the CPU representation of a VOX scene graph. */
export interface VOXTransformNode {
  /** Node kind discriminator. */
  readonly type: "transform";
  /** Source node identifier. */
  readonly id: number;
  /** Source transform-node attributes. */
  readonly attributes: Readonly<Record<string, string>>;
  /** Child node identifier. */
  readonly childNodeId: number;
  /** Source layer identifier. */
  readonly layerId: number;
  /** Transform frames; the first frame is used for static CPU scenes. */
  readonly frames: readonly VOXFrame[];
}

/** Group node in the CPU representation of a VOX scene graph. */
export interface VOXGroupNode {
  /** Node kind discriminator. */
  readonly type: "group";
  /** Source node identifier. */
  readonly id: number;
  /** Source group-node attributes. */
  readonly attributes: Readonly<Record<string, string>>;
  /** Child node identifiers in source order. */
  readonly childIds: readonly number[];
}

/** Shape node in the CPU representation of a VOX scene graph. */
export interface VOXShapeNode {
  /** Node kind discriminator. */
  readonly type: "shape";
  /** Source node identifier. */
  readonly id: number;
  /** Source shape-node attributes. */
  readonly attributes: Readonly<Record<string, string>>;
  /** Model references and per-model attributes in source order. */
  readonly models: readonly VOXModelReference[];
}

/** One model reference stored by an nSHP shape node. */
export interface VOXModelReference {
  /** Zero-based model index into {@link VOXLoaderResult.chunks}. */
  readonly modelId: number;
  /** Source model attributes. */
  readonly attributes: Readonly<Record<string, string>>;
}

/** Union of supported VOX scene-graph node kinds. */
export type VOXNode = VOXTransformNode | VOXGroupNode | VOXShapeNode;

/** Parsed VOX asset with CPU chunks and an optional EASEL scene graph. */
export interface VOXLoaderResult {
  /** CPU voxel model chunks in source order. */
  readonly chunks: readonly VOXChunk[];
  /** Root EASEL node built from node id zero, or `null` when absent. */
  readonly scene: Node | null;
  /** Parsed scene-graph nodes keyed by source node id. */
  readonly nodes: Readonly<Record<number, VOXNode>>;
  /** Global palette applied to every decoded chunk. */
  readonly palette: readonly number[];
}

/** CPU occupancy and color volume derived from a VOX model chunk. */
export interface VOXVoxelVolume {
  /** Model dimensions in source X/Y/Z order. */
  readonly size: VOXSize;
  /** One byte per voxel: zero for empty, 255 for occupied. */
  readonly occupancy: Uint8Array;
  /** One byte palette index per voxel, or zero for empty. */
  readonly colors: Uint8Array;
  /** Palette used by the color-index volume. */
  readonly palette: readonly number[];
}

interface MutableChunk {
  size: VOXSize;
  data: Uint8Array | undefined;
}

interface ParsedChunkState {
  readonly chunks: MutableChunk[];
  palette: number[];
  nodes: Record<number, VOXNode>;
}

interface ParsedString {
  readonly value: string;
  readonly next: number;
}

interface ParsedDictionary {
  readonly value: Readonly<Record<string, string>>;
  readonly next: number;
}

const VOX_MAGIC = "VOX ";
const DEFAULT_PALETTE: readonly number[] = [
  0x00000000, 0xffffffff, 0xffccffff, 0xff99ffff, 0xff66ffff, 0xff33ffff,
  0xff00ffff, 0xffffccff, 0xffccccff, 0xff99ccff, 0xff66ccff, 0xff33ccff,
  0xff00ccff, 0xffff99ff, 0xffcc99ff, 0xff9999ff, 0xff6699ff, 0xff3399ff,
  0xff0099ff, 0xffff66ff, 0xffcc66ff, 0xff9966ff, 0xff6666ff, 0xff3366ff,
  0xff0066ff, 0xffff33ff, 0xffcc33ff, 0xff9933ff, 0xff6633ff, 0xff3333ff,
  0xff0033ff, 0xffff00ff, 0xffcc00ff, 0xff9900ff, 0xff6600ff, 0xff3300ff,
  0xff0000ff, 0xffffffcc, 0xffccffcc, 0xff99ffcc, 0xff66ffcc, 0xff33ffcc,
  0xff00ffcc, 0xffffcccc, 0xffcccccc, 0xff99cccc, 0xff66cccc, 0xff33cccc,
  0xff00cccc, 0xffff99cc, 0xffcc99cc, 0xff9999cc, 0xff6699cc, 0xff3399cc,
  0xff0099cc, 0xffff66cc, 0xffcc66cc, 0xff9966cc, 0xff6666cc, 0xff3366cc,
  0xff0066cc, 0xffff33cc, 0xffcc33cc, 0xff9933cc, 0xff6633cc, 0xff3333cc,
  0xff0033cc, 0xffff00cc, 0xffcc00cc, 0xff9900cc, 0xff6600cc, 0xff3300cc,
  0xff0000cc, 0xffffff99, 0xffccff99, 0xff99ff99, 0xff66ff99, 0xff33ff99,
  0xff00ff99, 0xffffcc99, 0xffcccc99, 0xff99cc99, 0xff66cc99, 0xff33cc99,
  0xff00cc99, 0xffff9999, 0xffcc9999, 0xff999999, 0xff669999, 0xff339999,
  0xff009999, 0xffff6699, 0xffcc6699, 0xff996699, 0xff666699, 0xff336699,
  0xff006699, 0xffff3399, 0xffcc3399, 0xff993399, 0xff663399, 0xff333399,
  0xff003399, 0xffff0099, 0xffcc0099, 0xff990099, 0xff660099, 0xff330099,
  0xff000099, 0xffffff66, 0xffccff66, 0xff99ff66, 0xff66ff66, 0xff33ff66,
  0xff00ff66, 0xffffcc66, 0xffcccc66, 0xff99cc66, 0xff66cc66, 0xff33cc66,
  0xff00cc66, 0xffff9966, 0xffcc9966, 0xff999966, 0xff669966, 0xff339966,
  0xff009966, 0xffff6666, 0xffcc6666, 0xff996666, 0xff666666, 0xff336666,
  0xff006666, 0xffff3366, 0xffcc3366, 0xff993366, 0xff663366, 0xff333366,
  0xff003366, 0xffff0066, 0xffcc0066, 0xff990066, 0xff660066, 0xff330066,
  0xff000066, 0xffffff33, 0xffccff33, 0xff99ff33, 0xff66ff33, 0xff33ff33,
  0xff00ff33, 0xffffcc33, 0xffcccc33, 0xff99cc33, 0xff66cc33, 0xff33cc33,
  0xff00cc33, 0xffff9933, 0xffcc9933, 0xff999933, 0xff669933, 0xff339933,
  0xff009933, 0xffff6633, 0xffcc6633, 0xff996633, 0xff666633, 0xff336633,
  0xff006633, 0xffff3333, 0xffcc3333, 0xff993333, 0xff663333, 0xff333333,
  0xff003333, 0xffff0033, 0xffcc0033, 0xff990033, 0xff660033, 0xff330033,
  0xff000033, 0xffffff00, 0xffccff00, 0xff99ff00, 0xff66ff00, 0xff33ff00,
  0xff00ff00, 0xffffcc00, 0xffcccc00, 0xff99cc00, 0xff66cc00, 0xff33cc00,
  0xff00cc00, 0xffff9900, 0xffcc9900, 0xff999900, 0xff669900, 0xff339900,
  0xff009900, 0xffff6600, 0xffcc6600, 0xff996600, 0xff666600, 0xff336600,
  0xff006600, 0xffff3300, 0xffcc3300, 0xff993300, 0xff663300, 0xff333300,
  0xff003300, 0xffff0000, 0xffcc0000, 0xff990000, 0xff660000, 0xff330000,
  0xff0000ee, 0xff0000dd, 0xff0000bb, 0xff0000aa, 0xff000088, 0xff000077,
  0xff000055, 0xff000044, 0xff000022, 0xff000011, 0xff00ee00, 0xff00dd00,
  0xff00bb00, 0xff00aa00, 0xff008800, 0xff007700, 0xff005500, 0xff004400,
  0xff002200, 0xff001100, 0xffee0000, 0xffdd0000, 0xffbb0000, 0xffaa0000,
  0xff880000, 0xff770000, 0xff550000, 0xff440000, 0xff220000, 0xff110000,
  0xffeeeeee, 0xffdddddd, 0xffbbbbbb, 0xffaaaaaa, 0xff888888, 0xff777777,
  0xff555555, 0xff444444, 0xff222222, 0xff111111,
];

function fail(message: string): never {
  throw new SyntaxError(`VOXLoader: ${message}`);
}

function checkedEnd(
  start: number,
  size: number,
  end: number,
  label: string,
): number {
  if (!Number.isSafeInteger(size) || size < 0 || start > end - size) {
    fail(`${label} exceeds the input boundary.`);
  }
  return start + size;
}

function readString(view: DataView, offset: number, end: number): ParsedString {
  const countEnd = checkedEnd(offset, 4, end, "string length");
  const count = view.getUint32(offset, true);
  const valueEnd = checkedEnd(countEnd, count, end, "string");
  const bytes = new Uint8Array(view.buffer, view.byteOffset + countEnd, count);
  return { value: new TextDecoder().decode(bytes), next: valueEnd };
}

function readDictionary(
  view: DataView,
  offset: number,
  end: number,
): ParsedDictionary {
  const countEnd = checkedEnd(offset, 4, end, "dictionary count");
  const count = view.getUint32(offset, true);
  const value: Record<string, string> = {};
  let next = countEnd;
  for (let index = 0; index < count; index++) {
    const key = readString(view, next, end);
    const stringValue = readString(view, key.next, end);
    value[key.value] = stringValue.value;
    next = stringValue.next;
  }
  return { value, next };
}

function decodeRotation(byte: number): Matrix4 {
  const index1 = byte & 0x3;
  const index2 = (byte >> 2) & 0x3;
  const index3 = 3 - index1 - index2;
  if (
    index1 > 2 ||
    index2 > 2 ||
    index3 < 0 ||
    index3 > 2 ||
    index1 === index2
  ) {
    fail(`invalid nTRN rotation byte ${byte}.`);
  }
  const sign1 = byte & 0x10 ? -1 : 1;
  const sign2 = byte & 0x20 ? -1 : 1;
  const sign3 = byte & 0x40 ? -1 : 1;
  const rows = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  rows[0]![index1] = sign1;
  rows[1]![index2] = sign2;
  rows[2]![index3] = sign3;
  return new Matrix4().set(
    rows[0]![0]!,
    rows[0]![2]!,
    -rows[0]![1]!,
    0,
    rows[2]![0]!,
    rows[2]![2]!,
    -rows[2]![1]!,
    0,
    -rows[1]![0]!,
    -rows[1]![2]!,
    rows[1]![1]!,
    0,
    0,
    0,
    0,
    1,
  );
}

function readFrame(
  view: DataView,
  offset: number,
  end: number,
): { frame: VOXFrame; next: number } {
  const attributes = readDictionary(view, offset, end);
  let rotation: Matrix4 | undefined;
  let translation: VOXTranslation | undefined;
  const rotationValue = attributes.value["_r"];
  if (rotationValue !== undefined) {
    const byte = Number.parseInt(rotationValue, 10);
    if (!Number.isInteger(byte) || byte < 0 || byte > 255)
      fail("invalid nTRN rotation attribute.");
    rotation = decodeRotation(byte);
  }
  const translationValue = attributes.value["_t"];
  if (translationValue !== undefined) {
    const values = translationValue.trim().split(/\s+/u).map(Number);
    if (
      values.length < 3 ||
      values.slice(0, 3).some((value) => !Number.isFinite(value))
    ) {
      fail("invalid nTRN translation attribute.");
    }
    translation = { x: values[0]!, y: values[1]!, z: values[2]! };
  }
  return {
    frame: { rotation, translation, attributes: attributes.value },
    next: attributes.next,
  };
}

function readChunkId(view: DataView, offset: number, end: number): string {
  const next = checkedEnd(offset, 4, end, "chunk id");
  let id = "";
  for (let index = offset; index < next; index++)
    id += String.fromCharCode(view.getUint8(index));
  return id;
}

function copyPalette(
  view: DataView,
  offset: number,
  contentEnd: number,
): number[] {
  if (contentEnd - offset < 1024) fail("RGBA chunk is truncated.");
  const palette = [0];
  for (let index = 0; index < 256; index++)
    palette.push(view.getUint32(offset + index * 4, true));
  return palette;
}

function validateChunk(chunk: MutableChunk, index: number): VOXChunk {
  if (!chunk.data) fail(`model ${index} is missing an XYZI chunk.`);
  const { x, y, z } = chunk.size;
  if (x < 1 || y < 1 || z < 1) fail(`model ${index} has invalid dimensions.`);
  const expected = x * y * z;
  if (!Number.isSafeInteger(expected))
    fail(`model ${index} dimensions are too large.`);
  for (let offset = 0; offset < chunk.data.length; offset += 4) {
    const vx = chunk.data[offset]!;
    const vy = chunk.data[offset + 1]!;
    const vz = chunk.data[offset + 2]!;
    const color = chunk.data[offset + 3]!;
    if (vx >= x || vy >= y || vz >= z || color === 0)
      fail(`model ${index} contains an invalid voxel record.`);
  }
  return { size: chunk.size, data: chunk.data, palette: [] };
}

function applyNodeMetadata(
  object: Node,
  attributes: Readonly<Record<string, string>>,
  kind: string,
): void {
  const name = attributes["_name"];
  if (name !== undefined) object.name = name;
  object.userData["vox"] = { type: kind, attributes: { ...attributes } };
}

function applyTransform(object: Node, node: VOXTransformNode): void {
  applyNodeMetadata(object, node.attributes, node.type);
  const frame = node.frames[0];
  if (!frame) return;
  if (frame.rotation) object.applyMatrix4(frame.rotation);
  if (frame.translation) {
    object.position.set(
      frame.translation.x,
      frame.translation.z,
      -frame.translation.y,
    );
  }
}

function getChunk(chunks: readonly VOXChunk[], modelId: number): VOXChunk {
  const chunk = chunks[modelId];
  if (!chunk) fail(`shape references missing model ${modelId}.`);
  return chunk;
}

function buildObject(
  nodeId: number,
  nodes: Readonly<Record<number, VOXNode>>,
  chunks: readonly VOXChunk[],
  path: Set<number>,
): Node | null {
  const node = nodes[nodeId];
  if (!node) fail(`scene references missing node ${nodeId}.`);
  if (path.has(nodeId)) fail(`scene graph contains a cycle at node ${nodeId}.`);
  path.add(nodeId);
  let object: Node | null = null;
  if (node.type === "transform") {
    const childNode = nodes[node.childNodeId];
    if (!childNode)
      fail(
        `transform node ${node.id} references missing child ${node.childNodeId}.`,
      );
    if (childNode.type === "shape" && childNode.models.length === 1) {
      const reference = childNode.models[0]!;
      object = buildMesh(getChunk(chunks, reference.modelId));
      applyTransform(object, node);
    } else {
      const hasTransform = node.frames.some(
        (frame) => frame.rotation || frame.translation,
      );
      if (!hasTransform) {
        object = buildObject(node.childNodeId, nodes, chunks, path);
        if (object) applyNodeMetadata(object, node.attributes, node.type);
      } else {
        const group = new Group();
        applyTransform(group, node);
        const child = buildObject(node.childNodeId, nodes, chunks, path);
        if (child) group.add(child);
        object = group;
      }
    }
  } else if (node.type === "group") {
    const group = new Group();
    applyNodeMetadata(group, node.attributes, node.type);
    for (const childId of node.childIds) {
      const child = buildObject(childId, nodes, chunks, path);
      if (child) group.add(child);
    }
    object = group;
  } else {
    if (node.models.length === 1) {
      const reference = node.models[0]!;
      object = buildMesh(getChunk(chunks, reference.modelId));
      applyNodeMetadata(object, node.attributes, node.type);
    } else {
      const group = new Group();
      applyNodeMetadata(group, node.attributes, node.type);
      for (const reference of node.models)
        group.add(buildMesh(getChunk(chunks, reference.modelId)));
      object = group;
    }
  }
  path.delete(nodeId);
  return object;
}

/**
 * Builds a greedy-meshed CPU EASEL mesh from a decoded VOX chunk.
 *
 * Faces are centered and converted from MagicaVoxel's Z-up coordinates to
 * EASEL's Y-up coordinates. Palette colors become geometry RGB attributes;
 * no GPU buffers, shaders, or 3D texture resources are created.
 */
export function buildMesh(chunk: VOXChunk): Mesh {
  const { size, data, palette } = chunk;
  const sx = size.x;
  const sy = size.y;
  const sz = size.z;
  if (
    !(
      Number.isSafeInteger(sx) &&
      Number.isSafeInteger(sy) &&
      Number.isSafeInteger(sz)
    ) ||
    sx < 1 ||
    sy < 1 ||
    sz < 1
  ) {
    throw new RangeError(
      "VOXLoader: buildMesh requires positive safe dimensions.",
    );
  }
  if (data.length % 4 !== 0)
    throw new RangeError("VOXLoader: voxel data must use four-byte records.");
  const volumeLength = sx * sy * sz;
  if (!Number.isSafeInteger(volumeLength))
    throw new RangeError("VOXLoader: voxel volume is too large.");
  const volume = new Uint8Array(volumeLength);
  for (let offset = 0; offset < data.length; offset += 4) {
    const x = data[offset]!;
    const y = data[offset + 1]!;
    const z = data[offset + 2]!;
    const color = data[offset + 3]!;
    if (x >= sx || y >= sy || z >= sz || color === 0)
      throw new RangeError("VOXLoader: voxel record is outside the model.");
    volume[x + y * sx + z * sx * sy] = color;
  }
  const vertices: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const dims = [sx, sy, sz];
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;
    const dimsD = dims[d]!;
    const dimsU = dims[u]!;
    const dimsV = dims[v]!;
    const q = [0, 0, 0];
    q[d] = 1;
    const mask = new Int16Array(dimsU * dimsV);
    for (let slice = 0; slice <= dimsD; slice++) {
      let cursor = 0;
      for (let vv = 0; vv < dimsV; vv++) {
        for (let uu = 0; uu < dimsU; uu++) {
          const pos = [0, 0, 0];
          pos[d] = slice;
          pos[u] = uu;
          pos[v] = vv;
          const x0 = pos[0]!;
          const y0 = pos[1]!;
          const z0 = pos[2]!;
          const behind =
            slice > 0
              ? (volume[
                  x0 - q[0]! + (y0 - q[1]!) * sx + (z0 - q[2]!) * sx * sy
                ] ?? 0)
              : 0;
          const infront =
            slice < dimsD ? (volume[x0 + y0 * sx + z0 * sx * sy] ?? 0) : 0;
          mask[cursor++] =
            behind > 0 && infront === 0
              ? behind
              : infront > 0 && behind === 0
                ? -infront
                : 0;
        }
      }
      cursor = 0;
      for (let vv = 0; vv < dimsV; vv++) {
        for (let uu = 0; uu < dimsU; ) {
          const colorCode = mask[cursor]!;
          if (colorCode === 0) {
            uu++;
            cursor++;
            continue;
          }
          let width = 1;
          while (uu + width < dimsU && mask[cursor + width] === colorCode)
            width++;
          let height = 1;
          let done = false;
          while (vv + height < dimsV && !done) {
            for (let k = 0; k < width; k++) {
              if (mask[cursor + k + height * dimsU] !== colorCode) {
                done = true;
                break;
              }
            }
            if (!done) height++;
          }
          const pos = [0, 0, 0];
          pos[d] = slice;
          pos[u] = uu;
          pos[v] = vv;
          const du = [0, 0, 0];
          const dv = [0, 0, 0];
          du[u] = width;
          dv[v] = height;
          const toEasel = (point: number[]): [number, number, number] => [
            point[0]! - sx / 2,
            point[2]! - sz / 2,
            -point[1]! + sy / 2,
          ];
          const v0 = toEasel(pos);
          const v1 = toEasel([
            pos[0]! + du[0]!,
            pos[1]! + du[1]!,
            pos[2]! + du[2]!,
          ]);
          const v2 = toEasel([
            pos[0]! + du[0]! + dv[0]!,
            pos[1]! + du[1]! + dv[1]!,
            pos[2]! + du[2]! + dv[2]!,
          ]);
          const v3 = toEasel([
            pos[0]! + dv[0]!,
            pos[1]! + dv[1]!,
            pos[2]! + dv[2]!,
          ]);
          const vertexIndex = vertices.length / 3;
          if (colorCode > 0) {
            vertices.push(...v0, ...v1, ...v2, ...v3);
          } else {
            vertices.push(...v0, ...v3, ...v2, ...v1);
          }
          indices.push(
            vertexIndex,
            vertexIndex + 1,
            vertexIndex + 2,
            vertexIndex,
            vertexIndex + 2,
            vertexIndex + 3,
          );
          const packed = palette[Math.abs(colorCode)] ?? 0xffffffff;
          const red = (packed & 0xff) / 255;
          const green = ((packed >> 8) & 0xff) / 255;
          const blue = ((packed >> 16) & 0xff) / 255;
          for (let vertex = 0; vertex < 4; vertex++)
            colors.push(red, green, blue);
          for (let row = 0; row < height; row++)
            for (let column = 0; column < width; column++)
              mask[cursor + column + row * dimsU] = 0;
          uu += width;
          cursor += width;
        }
      }
    }
  }
  const geometry = new Geometry().setPositions(vertices);
  geometry.index = indices;
  geometry.setColors(colors);
  geometry.computeVertexNormals().computeBoundingBox().computeBoundingSphere();
  return new Mesh(geometry, new LambertMaterial({ vertexColors: true }));
}

/** Builds an occupancy and color-index volume without creating a GPU texture. */
export function buildVoxelVolume(chunk: VOXChunk): VOXVoxelVolume {
  const { x, y, z } = chunk.size;
  if (
    !(
      Number.isSafeInteger(x) &&
      Number.isSafeInteger(y) &&
      Number.isSafeInteger(z)
    ) ||
    x < 1 ||
    y < 1 ||
    z < 1
  ) {
    throw new RangeError(
      "VOXLoader: buildVoxelVolume requires positive safe dimensions.",
    );
  }
  const length = x * y * z;
  if (!Number.isSafeInteger(length))
    throw new RangeError("VOXLoader: voxel volume is too large.");
  const occupancy = new Uint8Array(length);
  const colors = new Uint8Array(length);
  if (chunk.data.length % 4 !== 0)
    throw new RangeError("VOXLoader: voxel data must use four-byte records.");
  for (let offset = 0; offset < chunk.data.length; offset += 4) {
    const vx = chunk.data[offset]!;
    const vy = chunk.data[offset + 1]!;
    const vz = chunk.data[offset + 2]!;
    const color = chunk.data[offset + 3]!;
    if (vx >= x || vy >= y || vz >= z || color === 0)
      throw new RangeError("VOXLoader: voxel record is outside the model.");
    const index = vx + vy * x + vz * x * y;
    occupancy[index] = 255;
    colors[index] = color;
  }
  return { size: chunk.size, occupancy, colors, palette: chunk.palette };
}

/** CPU compatibility wrapper matching THREE.VOXMesh without GPU resources.
 * @deprecated Use {@link buildMesh} when a named helper is preferable.
 */
export class VOXMesh extends Mesh {
  /** Constructs a mesh from one decoded VOX chunk. */
  constructor(chunk: VOXChunk) {
    const mesh = buildMesh(chunk);
    super(mesh.geometry, mesh.material);
  }
}

/** Loads and parses MagicaVoxel VOX 150/200 assets into CPU EASEL data. */
export class VOXLoader extends Loader {
  /** Loads a VOX resource through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (result: VOXLoaderResult) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "arraybuffer";
    fileLoader.requestHeader = this.requestHeader;
    fileLoader.withCredentials = this.withCredentials;
    fileLoader.load(
      url,
      (data) => {
        try {
          onLoad?.(this.parse(data as ArrayBuffer));
        } catch (error) {
          onError?.(error);
          this.manager.itemError(url);
        }
      },
      onProgress,
      onError,
    );
  }

  /** Parses a VOX 150/200 ArrayBuffer or ArrayBufferView into CPU data. */
  parse(input: ArrayBuffer | ArrayBufferView): VOXLoaderResult {
    const bytes =
      input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    if (bytes.byteLength < 8) fail("file header is truncated.");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = new TextDecoder().decode(bytes.subarray(0, 4));
    if (magic !== VOX_MAGIC) fail("invalid VOX file magic.");
    const version = view.getUint32(4, true);
    if (version !== 150 && version !== 200)
      fail(`unsupported VOX version ${version}.`);
    const state: ParsedChunkState = {
      chunks: [],
      palette: [...DEFAULT_PALETTE],
      nodes: {},
    };
    const parseRange = (start: number, end: number): void => {
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
        if (id === "SIZE") {
          if (contentSize < 12) fail("SIZE chunk is truncated.");
          const size = {
            x: view.getUint32(contentStart, true),
            y: view.getUint32(contentStart + 4, true),
            z: view.getUint32(contentStart + 8, true),
          };
          state.chunks.push({ size, data: undefined });
        } else if (id === "XYZI") {
          if (state.chunks.length === 0 || contentSize < 4)
            fail("XYZI chunk has no preceding SIZE chunk.");
          const count = view.getUint32(contentStart, true);
          const byteLength = count * 4;
          if (!Number.isSafeInteger(byteLength) || byteLength > contentSize - 4)
            fail("XYZI voxel payload is truncated.");
          const dataStart = contentStart + 4;
          state.chunks[state.chunks.length - 1]!.data = bytes.slice(
            dataStart,
            dataStart + byteLength,
          );
        } else if (id === "RGBA") {
          state.palette = copyPalette(view, contentStart, contentEnd);
        } else if (id === "nTRN") {
          const minimum = contentStart + 4;
          if (contentSize < 16) fail("nTRN chunk is truncated.");
          let offset = minimum;
          const attributes = readDictionary(view, offset, contentEnd);
          offset = attributes.next;
          if (offset + 16 > contentEnd)
            fail("nTRN transform payload is truncated.");
          const childNodeId = view.getUint32(offset, true);
          offset += 4;
          offset += 4;
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
        } else if (id === "nGRP") {
          if (contentSize < 8) fail("nGRP chunk is truncated.");
          let offset = contentStart;
          const nodeId = view.getUint32(offset, true);
          offset += 4;
          const attributes = readDictionary(view, offset, contentEnd);
          offset = attributes.next;
          if (offset + 4 > contentEnd) fail("nGRP child count is truncated.");
          const count = view.getUint32(offset, true);
          offset += 4;
          if (count > (contentEnd - offset) / 4)
            fail("nGRP child list is truncated.");
          const childIds: number[] = [];
          for (let child = 0; child < count; child++, offset += 4)
            childIds.push(view.getUint32(offset, true));
          state.nodes[nodeId] = {
            type: "group",
            id: nodeId,
            attributes: attributes.value,
            childIds,
          };
        } else if (id === "nSHP") {
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
        if (childrenSize > 0) parseRange(contentEnd, chunkEnd);
        cursor = chunkEnd;
      }
    };
    parseRange(8, bytes.byteLength);
    if (state.chunks.length === 0) fail("file contains no SIZE model chunks.");
    const chunks: VOXChunk[] = [];
    for (let index = 0; index < state.chunks.length; index++) {
      const validated = validateChunk(state.chunks[index]!, index);
      chunks.push({
        size: validated.size,
        data: validated.data,
        palette: state.palette,
      });
    }
    const scene = state.nodes[0]
      ? buildObject(0, state.nodes, chunks, new Set())
      : null;
    return { chunks, scene, nodes: state.nodes, palette: state.palette };
  }
}
