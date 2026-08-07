import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Group } from "../objects/Group.ts";
import { LineSegments } from "../objects/LineSegments.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

interface GCodeState {
  x: number;
  y: number;
  z: number;
  e: number;
  f: number;
  relative: boolean;
  extrusionOverride: boolean;
  extrusionRelative: boolean;
}

interface GCodeLayer {
  z: number;
  vertex: number[];
  pathVertex: number[];
  index: number;
}

interface GCodeWord {
  letter: string;
  value: number;
}

interface GCodeCommandLine {
  command?: GCodeWord;
  args: Map<string, number>;
  comment: string;
}

interface GCodeParseContext {
  layers: GCodeLayer[];
  feedRates: number[];
  currentLayer: GCodeLayer | undefined;
  pendingLayer: { index?: number; z?: number } | undefined;
}

const wordPattern =
  /(?<letter>[A-Za-z])(?<value>[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/gu;
const numericPattern = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/u;
const lineBreakPattern = /\r?\n|\r/u;
const layerPattern = /(?:^|\b)LAYER\s*[:=]?\s*(?<value>[^\s]+)/iu;
const layerCountPattern = /LAYER_COUNT/iu;
const layerZPattern = /\bZ\s*[:=]?\s*(?<value>[^\s]+)/iu;
const commentPattern = /\([^)]*\)/gu;
const epsilon = 1e-9;

/** Loads common G-code toolpaths into CPU line-segment scene objects.
 *
 * The parser follows the movement and modal-state behavior used by THREE's
 * `GCodeLoader`: `G0`/`G1` moves become travel or extrusion line segments,
 * `G90`/`G91` select coordinate mode, `M82`/`M83` select extrusion mode, and
 * `G92` resets the machine position. The result remains ordinary EASEL
 * geometry and `LineSegments`, so it can be rasterized by Canvas2D without a
 * renderer-specific or GPU format.
 */
export class GCodeLoader extends Loader {
  /** Whether to create one travel/extrusion pair for every parsed layer. */
  splitLayer: boolean = false;

  /** Loads a G-code resource through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (group: Group) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "text";
    fileLoader.requestHeader = this.requestHeader;
    fileLoader.withCredentials = this.withCredentials;
    fileLoader.load(
      url,
      (text) => onLoad?.(this.parse(String(text))),
      onProgress,
      onError,
    );
  }

  /** Parses G-code text into travel and extrusion `LineSegments`.
   *
   * Travel segments use a red material named `path`; positive-extrusion
   * segments use a green material named `extruded`, matching THREE's loader.
   * Layer comments such as `;LAYER:12` are retained in the returned group's
   * `userData.layers` metadata and select the next movement layer when
   * `splitLayer` is enabled.
   */
  override parse(data: string): Group {
    if (typeof data !== "string") {
      throw new TypeError("GCodeLoader.parse requires G-code text.");
    }
    const parsed = parseGCode(data);
    return createGroup(parsed.layers, parsed.feedRates, this.splitLayer);
  }
}

function parseGCode(data: string): {
  layers: GCodeLayer[];
  feedRates: number[];
} {
  const state: GCodeState = {
    x: 0,
    y: 0,
    z: 0,
    e: 0,
    f: 0,
    relative: false,
    extrusionOverride: false,
    extrusionRelative: false,
  };
  const context: GCodeParseContext = {
    layers: [],
    feedRates: [],
    currentLayer: undefined,
    pendingLayer: undefined,
  };
  for (const rawLine of data.split(lineBreakPattern)) {
    const line = readCommandLine(rawLine);
    if (line.comment) {
      const layer = readLayerComment(line.comment);
      if (layer !== undefined) context.pendingLayer = layer;
    }
    if (line.command === undefined) continue;
    processCommand(line.command, line.args, state, context);
  }
  return { layers: context.layers, feedRates: context.feedRates };
}

function readCommandLine(rawLine: string): GCodeCommandLine {
  const semicolon = rawLine.indexOf(";");
  const code = (semicolon < 0 ? rawLine : rawLine.slice(0, semicolon))
    .replace(commentPattern, "")
    .trim();
  const comment = semicolon < 0 ? "" : rawLine.slice(semicolon + 1);
  const words = readWords(code);
  const commandIndex = words.findIndex(
    (word) => word.letter === "G" || word.letter === "M",
  );
  if (commandIndex < 0) return { args: new Map(), comment };
  const command = words[commandIndex];
  if (command === undefined) return { args: new Map(), comment };
  const args = new Map<string, number>();
  for (const word of words.slice(commandIndex + 1)) {
    if (word.letter !== "G" && word.letter !== "M") {
      args.set(word.letter, word.value);
    }
  }
  return { command, args, comment };
}

function readWords(code: string): GCodeWord[] {
  const words: GCodeWord[] = [];
  for (const match of code.matchAll(wordPattern)) {
    const letter = match.groups?.["letter"]?.toUpperCase();
    const value = Number(match.groups?.["value"]);
    if (letter && Number.isFinite(value)) words.push({ letter, value });
  }
  return words;
}

function readLayerComment(
  comment: string,
): { index?: number; z?: number } | undefined {
  const layer = layerPattern.exec(comment);
  if (!layer || layerCountPattern.test(comment)) return;
  const value = Number(
    numericPattern.exec(layer.groups?.["value"] ?? "")?.[0] ?? "NaN",
  );
  const zMatch = layerZPattern.exec(comment);
  const z = Number(
    numericPattern.exec(zMatch?.groups?.["value"] ?? "")?.[0] ?? "NaN",
  );
  if (!(Number.isFinite(value) || Number.isFinite(z))) return;
  const result: { index?: number; z?: number } = {};
  if (Number.isFinite(value)) result.index = Math.trunc(value);
  if (Number.isFinite(z)) result.z = z;
  return result;
}

function processCommand(
  command: GCodeWord,
  args: ReadonlyMap<string, number>,
  state: GCodeState,
  context: GCodeParseContext,
): void {
  const commandNumber = Math.trunc(command.value);
  if (!Number.isFinite(commandNumber)) return;
  if (command.letter === "G") {
    processGCommand(commandNumber, args, state, context);
    return;
  }
  if (command.letter === "M") processMCommand(commandNumber, state);
}

function processGCommand(
  command: number,
  args: ReadonlyMap<string, number>,
  state: GCodeState,
  context: GCodeParseContext,
): void {
  switch (command) {
    case 0:
    case 1:
      processMovement(args, state, context);
      return;
    case 90:
      state.relative = false;
      state.extrusionOverride = false;
      return;
    case 91:
      state.relative = true;
      state.extrusionOverride = false;
      return;
    case 92:
      setPosition(state, args);
      return;
  }
}

function processMCommand(command: number, state: GCodeState): void {
  if (command === 82) {
    state.extrusionOverride = true;
    state.extrusionRelative = false;
  } else if (command === 83) {
    state.extrusionOverride = true;
    state.extrusionRelative = true;
  }
}

function processMovement(
  args: ReadonlyMap<string, number>,
  state: GCodeState,
  context: GCodeParseContext,
): void {
  const previous: GCodeState = { ...state };
  applyMovement(state, args);
  if (args.has("F")) context.feedRates.push(state.f);
  const extruding = state.e - previous.e > epsilon;
  const layer = ensureLayer(state.z, extruding, context);
  if (extruding) appendSegment(layer.vertex, previous, state);
  else appendSegment(layer.pathVertex, previous, state);
}

function ensureLayer(
  z: number,
  extruding: boolean,
  context: GCodeParseContext,
): GCodeLayer {
  const current = context.currentLayer;
  if (
    current !== undefined &&
    context.pendingLayer === undefined &&
    (!extruding || Math.abs(z - current.z) <= epsilon)
  ) {
    return current;
  }
  const pending = context.pendingLayer;
  const layer: GCodeLayer = {
    vertex: [],
    pathVertex: [],
    z: pending?.z ?? z,
    index: pending?.index ?? context.layers.length,
  };
  context.layers.push(layer);
  context.currentLayer = layer;
  context.pendingLayer = undefined;
  return layer;
}

function applyMovement(
  state: GCodeState,
  args: ReadonlyMap<string, number>,
): void {
  state.x = axisValue(state.x, args.get("X"), state.relative);
  state.y = axisValue(state.y, args.get("Y"), state.relative);
  state.z = axisValue(state.z, args.get("Z"), state.relative);
  const relativeExtrusion = state.extrusionOverride
    ? state.extrusionRelative
    : state.relative;
  state.e = axisValue(state.e, args.get("E"), relativeExtrusion);
  const feed = args.get("F");
  if (feed !== undefined && Number.isFinite(feed)) state.f = feed;
}

function setPosition(
  state: GCodeState,
  args: ReadonlyMap<string, number>,
): void {
  const x = args.get("X");
  const y = args.get("Y");
  const z = args.get("Z");
  const e = args.get("E");
  if (x !== undefined) state.x = x;
  if (y !== undefined) state.y = y;
  if (z !== undefined) state.z = z;
  if (e !== undefined) state.e = e;
}

function axisValue(
  current: number,
  value: number | undefined,
  relative: boolean,
): number {
  if (value === undefined || !Number.isFinite(value)) return current;
  return relative ? current + value : value;
}

function appendSegment(
  target: number[],
  first: GCodeState,
  second: GCodeState,
): void {
  target.push(first.x, first.y, first.z, second.x, second.y, second.z);
}

function createGroup(
  layers: readonly GCodeLayer[],
  feedRates: readonly number[],
  splitLayer: boolean,
): Group {
  const group = new Group();
  group.name = "gcode";
  group.rotation.set(-Math.PI / 2, 0, 0);
  group.userData["layers"] = layers.map((layer) => ({
    index: layer.index,
    z: layer.z,
  }));
  group.userData["feedRates"] = [...feedRates];
  const pathMaterial = new LineMaterial({ color: 0xff0000 });
  pathMaterial.name = "path";
  const extrudingMaterial = new LineMaterial({ color: 0x00ff00 });
  extrudingMaterial.name = "extruded";

  if (splitLayer) {
    for (const [index, layer] of layers.entries()) {
      addObject(group, layer.vertex, extrudingMaterial, `layer${index}`);
      addObject(group, layer.pathVertex, pathMaterial, `layer${index}`);
    }
    return group;
  }
  const vertex: number[] = [];
  const pathVertex: number[] = [];
  for (const layer of layers) {
    vertex.push(...layer.vertex);
    pathVertex.push(...layer.pathVertex);
  }
  addObject(group, vertex, extrudingMaterial, `layer${layers.length}`);
  addObject(group, pathVertex, pathMaterial, `layer${layers.length}`);
  return group;
}

function addObject(
  group: Group,
  vertices: readonly number[],
  material: LineMaterial,
  name: string,
): void {
  const geometry = new Geometry().setPositions([...vertices]);
  const segments = new LineSegments(geometry, material);
  segments.name = name;
  group.add(segments);
}
