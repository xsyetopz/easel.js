import { readLayerComment } from "./_GCodeLayerComments.ts";
import { createGroup as buildGroup } from "./_GCodeLoaderGroup.ts";

/** Segment classification used while parsing movement commands. */
export type GCodeMode = "extrusion" | "toolpath";

/** Mutable machine state while parsing G-code commands. */
export interface GCodeState {
  /** Current X coordinate. */
  x: number;
  /** Current Y coordinate. */
  y: number;
  /** Current Z coordinate. */
  z: number;
  /** Current extrusion coordinate. */
  e: number;
  /** Current feed rate. */
  f: number;
  /** Whether XYZ coordinates are relative. */
  relative: boolean;
  /** Whether extrusion override mode is active. */
  extrusionOverride: boolean;
  /** Whether extrusion coordinates are relative. */
  extrusionRelative: boolean;
}

/** Parsed geometry and metadata for one print layer. */
export interface GCodeLayer {
  /** Layer height or Z coordinate. */
  z: number;
  /** Extruding line-segment coordinates. */
  vertex: number[];
  /** Travel line-segment coordinates. */
  pathVertex: number[];
  /** Source layer index. */
  index: number;
}

/** Letter/value token parsed from a G-code command. */
export interface GCodeWord {
  /** Command letter. */
  letter: string;
  /** Numeric command value. */
  value: number;
}
type GCodeCaptureGroups = { letter?: string; value?: string };

/** Parsed command line with arguments and comment text. */
export interface GCodeCommandLine {
  /** Primary command token, when present. */
  command?: GCodeWord;
  /** Named numeric command arguments. */
  args: Map<string, number>;
  /** Trailing comment text. */
  comment: string;
}

/** Mutable parser context accumulated across G-code lines. */
export interface GCodeParseContext {
  /** Parsed layers. */
  layers: GCodeLayer[];
  /** Feed rates encountered in the input. */
  feedRates: number[];
  /** Current output layer, when one exists. */
  currentLayer: GCodeLayer | undefined;
  /** Pending layer metadata from a comment. */
  pendingLayer: { index?: number; z?: number } | undefined;
}

/** Parsed G-code geometry and feed-rate metadata. */
export interface GCodeParseResult {
  /** Parsed print layers. */
  layers: GCodeLayer[];
  /** Feed rates encountered in the input. */
  feedRates: number[];
}

const wordPattern =
  /(?<letter>[A-Za-z])(?<value>[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/gu;
const lineBreakPattern = /\r?\n|\r/u;
const commentPattern = /\([^)]*\)/gu;
const epsilon = 1e-9;

/** Builds a rotated line-segment group from parsed G-code layer data. */
export function createGroup(
  layers: readonly GCodeLayer[],
  feedRates: readonly number[],
  splitLayer: boolean,
  mode: GCodeMode,
): ReturnType<typeof buildGroup> {
  return buildGroup(layers, feedRates, splitLayer, mode);
}

/** Parses G-code text into layers, line segments, and encountered feed rates. */
export function parseGCode(
  data: string,
  mode: GCodeMode = "extrusion",
): GCodeParseResult {
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
    processCommand(line.command, line.args, state, context, mode);
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
    const groups = match.groups as GCodeCaptureGroups | undefined;
    const letter = groups?.letter?.toUpperCase();
    const value = Number(groups?.value);
    if (letter && Number.isFinite(value)) words.push({ letter, value });
  }
  return words;
}

function processCommand(
  command: GCodeWord,
  args: ReadonlyMap<string, number>,
  state: GCodeState,
  context: GCodeParseContext,
  mode: GCodeMode,
): void {
  const commandNumber = Math.trunc(command.value);
  if (!Number.isFinite(commandNumber)) return;
  if (command.letter === "G") {
    processGCommand(commandNumber, args, state, context, mode);
    return;
  }
  if (command.letter === "M") processMCommand(commandNumber, state);
}

function processGCommand(
  command: number,
  args: ReadonlyMap<string, number>,
  state: GCodeState,
  context: GCodeParseContext,
  mode: GCodeMode,
): void {
  switch (command) {
    case 0:
    case 1:
      processMovement(command, args, state, context, mode);
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
  command: number,
  args: ReadonlyMap<string, number>,
  state: GCodeState,
  context: GCodeParseContext,
  mode: GCodeMode,
): void {
  const previous: GCodeState = { ...state };
  applyMovement(state, args);
  if (args.has("F")) context.feedRates.push(state.f);
  const active =
    mode === "toolpath" ? command === 1 : state.e - previous.e > epsilon;
  const layer = ensureLayer(state.z, active, context);
  if (active) appendSegment(layer.vertex, previous, state);
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
