import { Matrix4 } from "../math/Matrix4.ts";
import type { VOXFrame, VOXTranslation } from "./VOXLoader.ts";

const WHITESPACE = /\s+/u;

/** String token and next byte offset parsed from a VOX chunk. */
export interface ParsedString {
  /** Decoded string value. */
  readonly value: string;
  /** Offset immediately after the token. */
  readonly next: number;
}

/** Dictionary token and next byte offset parsed from a VOX chunk. */
export interface ParsedDictionary {
  /** Decoded key/value entries. */
  readonly value: Readonly<Record<string, string>> & {
    readonly _r?: string;
    readonly _t?: string;
  };
  /** Offset immediately after the dictionary. */
  readonly next: number;
}

/** MagicaVoxel file signature. */
export const VOX_MAGIC = "VOX ";
/** Default 256-entry RGBA palette used when a VOX file omits one. */
export const DEFAULT_PALETTE: readonly number[] = [
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

/** Throws a consistently prefixed syntax error for malformed VOX data. */
export function fail(message: string): never {
  throw new SyntaxError(`VOXLoader: ${message}`);
}

/** Checks a chunk range and returns its exclusive end offset. */
export function checkedEnd(
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

/** Reads a length-prefixed UTF-8 string and its following offset. */
export function readString(
  view: DataView,
  offset: number,
  end: number,
): ParsedString {
  const countEnd = checkedEnd(offset, 4, end, "string length");
  const count = view.getUint32(offset, true);
  const valueEnd = checkedEnd(countEnd, count, end, "string");
  const bytes = new Uint8Array(view.buffer, view.byteOffset + countEnd, count);
  return { value: new TextDecoder().decode(bytes), next: valueEnd };
}

/** Reads a VOX attribute dictionary from a bounded chunk region. */
export function readDictionary(
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

/** Converts a MagicaVoxel packed rotation byte to a transform matrix. */
export function decodeRotation(byte: number): Matrix4 {
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
  rows[0][index1] = sign1;
  rows[1][index2] = sign2;
  rows[2][index3] = sign3;
  return new Matrix4().set(
    rows[0][0],
    rows[0][2],
    -rows[0][1],
    0,
    rows[2][0],
    rows[2][2],
    -rows[2][1],
    0,
    -rows[1][0],
    -rows[1][2],
    rows[1][1],
    0,
    0,
    0,
    0,
    1,
  );
}

/** Decodes nTRN rotation, translation, and attributes for one frame. */
export function readFrame(
  view: DataView,
  offset: number,
  end: number,
): { frame: VOXFrame; next: number } {
  const attributes = readDictionary(view, offset, end);
  let rotation: Matrix4 | undefined;
  let translation: VOXTranslation | undefined;
  const rotationValue = attributes.value._r;
  if (rotationValue !== undefined) {
    const byte = Number.parseInt(rotationValue, 10);
    if (!Number.isInteger(byte) || byte < 0 || byte > 255)
      fail("invalid nTRN rotation attribute.");
    rotation = decodeRotation(byte);
  }
  const translationValue = attributes.value._t;
  if (translationValue !== undefined) {
    const values = translationValue.trim().split(WHITESPACE).map(Number);
    if (
      values.length < 3 ||
      values.slice(0, 3).some((value) => !Number.isFinite(value))
    ) {
      fail("invalid nTRN translation attribute.");
    }
    translation = { x: values[0] ?? 0, y: values[1] ?? 0, z: values[2] ?? 0 };
  }
  return {
    frame: { rotation, translation, attributes: attributes.value },
    next: attributes.next,
  };
}

/** Reads the four-byte ASCII identifier at a VOX chunk boundary. */
export function readChunkId(
  view: DataView,
  offset: number,
  end: number,
): string {
  const next = checkedEnd(offset, 4, end, "chunk id");
  let id = "";
  for (let index = offset; index < next; index++)
    id += String.fromCharCode(view.getUint8(index));
  return id;
}

/** Copies the 256 RGBA entries from an RGBA chunk into a palette array. */
export function copyPalette(
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
