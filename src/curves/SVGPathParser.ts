import { Vector2 } from "../math/Vector2.ts";
import { ShapePath } from "./ShapePath.ts";
import { appendSVGArc } from "./SVGArc.ts";

interface Point {
  x: number;
  y: number;
}

interface ParserState {
  target: ShapePath;
  current: Point;
  subpathStart: Point;
  previousCommand: string;
  previousCubicControl: Point | undefined;
  previousQuadraticControl: Point | undefined;
  forceMove: boolean;
}

type CommandHandler = (
  state: ParserState,
  values: number[],
  relative: boolean,
) => void;

const TOKEN_PATTERN = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/gu;
const COMMAND_PATTERN = /^[a-zA-Z]$/u;
const COMMAND_ARGUMENTS: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};

/** Parses an SVG path data string into EASEL ShapePath subpaths. */
export class SVGPathParser {
  /** Converts SVG path data into line, Bezier, and ellipse curves. */
  parse(data: string, target: ShapePath = new ShapePath()): ShapePath {
    if (typeof data !== "string")
      throw new TypeError("SVG path data must be a string");
    const tokens = data.match(TOKEN_PATTERN) ?? [];
    parseTokens(tokens, makeState(target));
    return target;
  }
}

function makeState(target: ShapePath): ParserState {
  return {
    target,
    current: { x: 0, y: 0 },
    subpathStart: { x: 0, y: 0 },
    previousCommand: "",
    previousCubicControl: undefined,
    previousQuadraticControl: undefined,
    forceMove: false,
  };
}

function parseTokens(tokens: string[], state: ParserState): void {
  let index = 0;
  let command = "";
  while (index < tokens.length) {
    const result = consumeCommand(tokens, index, command, state);
    index = result.index;
    command = result.command;
  }
}

function consumeCommand(
  tokens: string[],
  index: number,
  command: string,
  state: ParserState,
): { index: number; command: string } {
  if (isCommand(tokens[index])) command = tokens[index] ?? "";
  if (isCommand(tokens[index])) index++;
  if (!command)
    throw new SyntaxError("SVG path data must start with a command");
  const upper = command.toUpperCase();
  const argumentCount = COMMAND_ARGUMENTS[upper];
  if (argumentCount === undefined)
    throw new SyntaxError(`Unsupported SVG path command: ${command}`);
  if (upper === "Z") {
    closePath(state);
    return { index, command: "" };
  }
  const handler = HANDLERS[upper];
  if (!handler)
    throw new SyntaxError(`Unsupported SVG path command: ${command}`);
  if (!hasArguments(tokens, index))
    throw new SyntaxError(`Missing arguments for SVG path command: ${command}`);
  let first = true;
  while (hasArguments(tokens, index)) {
    if (tokens.length - index < argumentCount)
      throw new SyntaxError(`Incomplete SVG path command: ${command}`);
    const values = tokens.slice(index, index + argumentCount).map(parseNumber);
    index += argumentCount;
    state.forceMove = upper === "M" && first;
    handler(state, values, command !== upper);
    state.previousCommand = upper;
    first = false;
    if (upper === "M") command = command === upper ? "L" : "l";
  }
  return { index, command };
}

/** Parses SVG path data using a fresh ShapePath target. */
export function parseSVGPath(data: string): ShapePath {
  return new SVGPathParser().parse(data);
}

/** Alias matching common loader/parser naming conventions. */
export const parsePath: (data: string) => ShapePath = parseSVGPath;

function isCommand(token: string | undefined): boolean {
  return token !== undefined && COMMAND_PATTERN.test(token);
}

function hasArguments(tokens: string[], index: number): boolean {
  return index < tokens.length && !isCommand(tokens[index]);
}

function parseNumber(token: string): number {
  const value = Number(token);
  if (!Number.isFinite(value)) throw new SyntaxError("Invalid SVG path number");
  return value;
}

function point(
  state: ParserState,
  x: number,
  y: number,
  relative: boolean,
): Point {
  return relative
    ? { x: state.current.x + x, y: state.current.y + y }
    : { x, y };
}

function ensurePath(state: ParserState): NonNullable<ShapePath["currentPath"]> {
  if (!state.target.currentPath)
    state.target.moveTo(state.current.x, state.current.y);
  return state.target.currentPath ?? throwMissingPath();
}

function throwMissingPath(): never {
  throw new Error("SVG path command has no current subpath");
}

function setCurrent(state: ParserState, next: Point): void {
  state.current = next;
}

function clearControls(state: ParserState): void {
  state.previousCubicControl = undefined;
  state.previousQuadraticControl = undefined;
}

function closePath(state: ParserState): void {
  if (state.target.currentPath) {
    state.target.currentPath.closePath();
    state.target.currentPath.currentPoint = new Vector2(
      state.subpathStart.x,
      state.subpathStart.y,
    );
  }
  state.current = { ...state.subpathStart };
  clearControls(state);
  state.previousCommand = "Z";
}

const HANDLERS: Record<string, CommandHandler> = {
  M: (state: ParserState, values: number[], relative: boolean) => {
    const next = point(state, values[0] ?? 0, values[1] ?? 0, relative);
    if (!state.target.currentPath || state.forceMove) {
      state.target.moveTo(next.x, next.y);
      state.subpathStart = { ...next };
    } else state.target.currentPath.lineTo(next.x, next.y);
    setCurrent(state, next);
    clearControls(state);
  },
  L: (state: ParserState, values: number[], relative: boolean) => {
    const next = point(state, values[0] ?? 0, values[1] ?? 0, relative);
    ensurePath(state).lineTo(next.x, next.y);
    setCurrent(state, next);
    clearControls(state);
  },
  H: (state: ParserState, values: number[], relative: boolean) => {
    const x = values[0] ?? 0;
    const next = { x: relative ? state.current.x + x : x, y: state.current.y };
    ensurePath(state).lineTo(next.x, next.y);
    setCurrent(state, next);
    clearControls(state);
  },
  V: (state: ParserState, values: number[], relative: boolean) => {
    const y = values[0] ?? 0;
    const next = { x: state.current.x, y: relative ? state.current.y + y : y };
    ensurePath(state).lineTo(next.x, next.y);
    setCurrent(state, next);
    clearControls(state);
  },
  C: (state: ParserState, values: number[], relative: boolean) => {
    const cp1 = point(state, values[0] ?? 0, values[1] ?? 0, relative);
    const cp2 = point(state, values[2] ?? 0, values[3] ?? 0, relative);
    const next = point(state, values[4] ?? 0, values[5] ?? 0, relative);
    ensurePath(state).bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, next.x, next.y);
    setCurrent(state, next);
    state.previousCubicControl = cp2;
    state.previousQuadraticControl = undefined;
  },
  S: (state: ParserState, values: number[], relative: boolean) => {
    const cp1 =
      state.previousCommand === "C" || state.previousCommand === "S"
        ? reflect(state.previousCubicControl, state.current)
        : { ...state.current };
    const cp2 = point(state, values[0] ?? 0, values[1] ?? 0, relative);
    const next = point(state, values[2] ?? 0, values[3] ?? 0, relative);
    ensurePath(state).bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, next.x, next.y);
    setCurrent(state, next);
    state.previousCubicControl = cp2;
    state.previousQuadraticControl = undefined;
  },
  Q: (state: ParserState, values: number[], relative: boolean) => {
    const control = point(state, values[0] ?? 0, values[1] ?? 0, relative);
    const next = point(state, values[2] ?? 0, values[3] ?? 0, relative);
    ensurePath(state).quadraticCurveTo(control.x, control.y, next.x, next.y);
    setCurrent(state, next);
    state.previousQuadraticControl = control;
    state.previousCubicControl = undefined;
  },
  T: (state: ParserState, values: number[], relative: boolean) => {
    const control =
      state.previousCommand === "Q" || state.previousCommand === "T"
        ? reflect(state.previousQuadraticControl, state.current)
        : { ...state.current };
    const next = point(state, values[0] ?? 0, values[1] ?? 0, relative);
    ensurePath(state).quadraticCurveTo(control.x, control.y, next.x, next.y);
    setCurrent(state, next);
    state.previousQuadraticControl = control;
    state.previousCubicControl = undefined;
  },
  A: (state: ParserState, values: number[], relative: boolean) => {
    const next = point(state, values[5] ?? 0, values[6] ?? 0, relative);
    appendSVGArc(ensurePath(state), state.current, next, {
      rx: Math.abs(values[0] ?? 0),
      ry: Math.abs(values[1] ?? 0),
      rotation: values[2] ?? 0,
      largeArc: (values[3] ?? 0) !== 0,
      sweep: (values[4] ?? 0) !== 0,
    });
    setCurrent(state, next);
    clearControls(state);
  },
};

function reflect(control: Point | undefined, around: Point): Point {
  return control
    ? { x: 2 * around.x - control.x, y: 2 * around.y - control.y }
    : { ...around };
}
