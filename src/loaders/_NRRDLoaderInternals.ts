import type {
  NRRDAxis,
  NRRDDataArray,
  NRRDEncoding,
  NRRDHeader,
  NRRDInput,
  NRRDScalarType,
} from "./NRRDLoader.ts";

const RE_BOM = /^\uFEFF/u;
const RE_LINE_SPLIT = /\r\n|\n|\r/u;
const RE_MAGIC = /^NRRD\d+$/u;
const RE_WHITESPACE = /\s+/u;
const RE_HEX_PREFIX = /^0x/u;
const RE_HEX_VALUE = /^[+-]?[0-9a-f]+$/u;
const RE_COMMA_SPLIT = /\s*,\s*/u;
const RE_PARENS = /\((?<inner>[^)]*)\)/u;

/** Byte width metadata for one supported NRRD scalar type. */
export interface NRRDTypeInfo {
  /** Canonical scalar type name. */
  readonly type: NRRDScalarType;
  /** Number of bytes per scalar value. */
  readonly bytes: 1 | 2 | 4 | 8;
}

/** Byte width and canonical name for each supported NRRD scalar type. */
export const typeInfo: Record<NRRDScalarType, NRRDTypeInfo> = {
  uint8: { type: "uint8", bytes: 1 },
  int8: { type: "int8", bytes: 1 },
  uint16: { type: "uint16", bytes: 2 },
  int16: { type: "int16", bytes: 2 },
  uint32: { type: "uint32", bytes: 4 },
  int32: { type: "int32", bytes: 4 },
  float32: { type: "float32", bytes: 4 },
  float64: { type: "float64", bytes: 8 },
};

/** Maps NRRD and common C-style scalar names to canonical types. */
export const typeAliases: Record<string, NRRDScalarType> = {
  uchar: "uint8",
  "unsigned char": "uint8",
  uint8: "uint8",
  uint8_t: "uint8",
  schar: "int8",
  "signed char": "int8",
  int8: "int8",
  int8_t: "int8",
  short: "int16",
  "short int": "int16",
  "signed short": "int16",
  "signed short int": "int16",
  sshort: "int16",
  int16: "int16",
  int16_t: "int16",
  ushort: "uint16",
  "unsigned short": "uint16",
  "unsigned short int": "uint16",
  uint16: "uint16",
  uint16_t: "uint16",
  uint: "uint32",
  "unsigned int": "uint32",
  uint32: "uint32",
  uint32_t: "uint32",
  int: "int32",
  "signed int": "int32",
  sint: "int32",
  int32: "int32",
  int32_t: "int32",
  float: "float32",
  float32: "float32",
  double: "float64",
  float64: "float64",
};

function parseHeaderFields(lines: string[]): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator < 0) {
      throw new SyntaxError(`NRRDLoader: malformed header field '${trimmed}'.`);
    }
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key) fields.set(key, value);
  }
  return fields;
}

function axisLabel(axis: number): NRRDAxis {
  if (axis === 0) return "x";
  if (axis === 1) return "y";
  return "z";
}

/** Parses an NRRD header into validated, normalized metadata. */
export function parseHeader(bytes: Uint8Array): NRRDHeader {
  const text = new TextDecoder().decode(bytes).replace(RE_BOM, "");
  const lines = text.split(RE_LINE_SPLIT);
  const magic = lines.shift()?.trim() ?? "";
  if (!RE_MAGIC.test(magic)) {
    throw new SyntaxError("NRRDLoader: input is not an NRRD file.");
  }
  const fields = parseHeaderFields(lines);
  if (fields.has("data file") || fields.has("datafile")) {
    throw new Error(
      "NRRDLoader: detached 'data file' payloads are not supported; provide a single-file NRRD.",
    );
  }
  const dimension = parsePositiveInteger(fields.get("dimension"), "dimension");
  if (dimension > 3) {
    throw new Error(
      "NRRDLoader: only one-, two-, and three-dimensional data are supported.",
    );
  }
  const sizes = parseSizes(fields.get("sizes"), dimension);
  const typeValue = fields.get("type")?.toLowerCase();
  const type = typeValue ? typeAliases[typeValue] : undefined;
  if (!type) {
    const original = fields.get("type") ?? "(missing)";
    throw new Error(`NRRDLoader: unsupported scalar type '${original}'.`);
  }
  const encoding = parseEncoding(fields.get("encoding"));
  const endian = parseEndian(fields.get("endian"));
  const spaceDirections = parseDirections(fields.get("space directions"));
  const spacings = parseSpacings(fields.get("spacings"));
  const spaceOrigin = parseVector(fields.get("space origin"));
  const spaceDimension = parseOptionalInteger(fields.get("space dimension"));
  const metadata = Object.freeze(Object.fromEntries(fields.entries()));
  return Object.freeze({
    magic,
    version: Number.parseInt(magic.slice(4), 10),
    dimension,
    sizes: Object.freeze(sizes),
    type,
    encoding,
    endian,
    space: fields.get("space"),
    spaceDimension,
    spaceDirections,
    spacings,
    spaceOrigin,
    metadata,
  });
}

/** Decodes raw, ASCII, or hexadecimal NRRD payload samples. */
export function decodePayload(
  payload: Uint8Array,
  header: NRRDHeader,
  count: number,
): NRRDDataArray {
  if (header.encoding === "raw") {
    return decodeRaw(payload, header, count);
  }
  const text = new TextDecoder().decode(payload).replace(/#.*$/gmu, " ");
  const tokens = text.trim() ? text.trim().split(RE_WHITESPACE) : [];
  if (tokens.length < count) {
    throw new Error(
      `NRRDLoader: ${header.encoding} payload contains ${tokens.length} samples; expected ${count}.`,
    );
  }
  const result = createDataArray(header.type, count);
  for (let index = 0; index < count; index++) {
    const token = tokens[index];
    const value = parseTextSample(token ?? "", header.type, header.encoding);
    if (Number.isNaN(value)) {
      throw new SyntaxError(
        `NRRDLoader: invalid ${header.encoding} sample '${token}'.`,
      );
    }
    result[index] = value;
  }
  return result;
}

/** Decodes binary NRRD samples using the declared scalar type and endianness. */
export function decodeRaw(
  payload: Uint8Array,
  header: NRRDHeader,
  count: number,
): NRRDDataArray {
  const bytes = typeInfo[header.type].bytes;
  const expectedBytes = count * bytes;
  if (payload.byteLength < expectedBytes) {
    throw new Error(
      `NRRDLoader: raw payload contains ${payload.byteLength} bytes; expected ${expectedBytes}.`,
    );
  }
  const result = createDataArray(header.type, count);
  if (bytes === 1) {
    result.set(
      new Uint8Array(payload.buffer, payload.byteOffset, count) as never,
    );
    if (header.type === "int8") {
      for (let index = 0; index < count; index++) {
        result[index] = new DataView(
          payload.buffer,
          payload.byteOffset,
          count,
        ).getInt8(index);
      }
    }
    return result;
  }
  const view = new DataView(payload.buffer, payload.byteOffset, expectedBytes);
  const little = header.endian !== "big";
  for (let index = 0; index < count; index++) {
    const offset = index * bytes;
    result[index] = readValue(view, offset, header.type, little);
  }
  return result;
}

/** Reads one typed scalar value from a DataView. */
export function readValue(
  view: DataView,
  offset: number,
  type: NRRDScalarType,
  little: boolean,
): number {
  switch (type) {
    case "uint16":
      return view.getUint16(offset, little);
    case "int16":
      return view.getInt16(offset, little);
    case "uint32":
      return view.getUint32(offset, little);
    case "int32":
      return view.getInt32(offset, little);
    case "float32":
      return view.getFloat32(offset, little);
    case "float64":
      return view.getFloat64(offset, little);
    case "uint8":
      return view.getUint8(offset);
    case "int8":
      return view.getInt8(offset);
  }
}

/** Allocates the typed array matching an NRRD scalar type. */
export function createDataArray(
  type: NRRDScalarType,
  length: number,
): NRRDDataArray {
  switch (type) {
    case "uint8":
      return new Uint8Array(length);
    case "int8":
      return new Int8Array(length);
    case "uint16":
      return new Uint16Array(length);
    case "int16":
      return new Int16Array(length);
    case "uint32":
      return new Uint32Array(length);
    case "int32":
      return new Int32Array(length);
    case "float32":
      return new Float32Array(length);
    case "float64":
      return new Float64Array(length);
  }
}

/** Converts one ASCII or hexadecimal sample token to a number. */
export function parseTextSample(
  token: string,
  type: NRRDScalarType,
  encoding: "ascii" | "hex",
): number {
  if (encoding === "ascii" || type === "float32" || type === "float64") {
    return Number(token);
  }
  const normalized = token.toLowerCase().replace(RE_HEX_PREFIX, "");
  if (!(normalized && RE_HEX_VALUE.test(normalized))) return Number.NaN;
  return Number.parseInt(normalized, 16);
}

/** Normalizes a declared NRRD encoding and rejects unsupported values. */
export function parseEncoding(value: string | undefined): NRRDEncoding {
  const normalized = (value ?? "raw").toLowerCase();
  if (normalized === "raw") return "raw";
  if (normalized === "ascii" || normalized === "text" || normalized === "txt") {
    return "ascii";
  }
  if (normalized === "hex") return "hex";
  throw new Error(
    `NRRDLoader: unsupported encoding '${value}'; supported encodings are raw, ascii, and hex.`,
  );
}

/** Normalizes the optional NRRD byte-order declaration. */
export function parseEndian(
  value: string | undefined,
): "little" | "big" | undefined {
  if (value === undefined || value === "") return;
  const normalized = value.toLowerCase();
  if (normalized === "little" || normalized === "big") return normalized;
  throw new Error(`NRRDLoader: unsupported endian '${value}'.`);
}

/** Parses a required positive safe integer NRRD field. */
export function parsePositiveInteger(
  value: string | undefined,
  name: string,
): number {
  const number = value === undefined ? Number.NaN : Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new SyntaxError(`NRRDLoader: ${name} must be a positive integer.`);
  }
  return number;
}

/** Parses an optional positive safe integer, returning undefined when absent. */
export function parseOptionalInteger(
  value: string | undefined,
): number | undefined {
  if (value === undefined || value === "") return;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

/** Parses one positive sample-size entry for each NRRD dimension. */
export function parseSizes(
  value: string | undefined,
  dimension: number,
): number[] {
  if (!value) throw new SyntaxError("NRRDLoader: sizes field is required.");
  const sizes = value.split(RE_WHITESPACE).map((entry) => Number(entry));
  if (
    sizes.length !== dimension ||
    sizes.some((size) => !Number.isSafeInteger(size) || size <= 0)
  ) {
    throw new SyntaxError(
      `NRRDLoader: sizes must contain ${dimension} positive integers.`,
    );
  }
  return sizes;
}

/** Parses optional NRRD space-direction vectors and none entries. */
export function parseDirections(
  value: string | undefined,
): readonly (readonly [number, number, number] | null)[] | undefined {
  if (value === undefined) return;
  const entries = value.match(/none|\([^)]*\)/giu) ?? [];
  return Object.freeze(
    entries.map((entry) => {
      if (entry.toLowerCase() === "none") return null;
      const components = entry
        .slice(1, -1)
        .split(RE_COMMA_SPLIT)
        .map((component) => Number(component));
      if (
        components.length !== 3 ||
        components.some((component) => !Number.isFinite(component))
      ) {
        throw new SyntaxError(
          `NRRDLoader: invalid space direction '${entry}'.`,
        );
      }
      return Object.freeze([
        components[0] ?? 0,
        components[1] ?? 0,
        components[2] ?? 0,
      ] as [number, number, number]);
    }),
  );
}

/** Parses optional per-axis spacings, preserving none markers. */
export function parseSpacings(
  value: string | undefined,
): readonly (number | null)[] | undefined {
  if (value === undefined) return;
  return Object.freeze(
    value.split(RE_WHITESPACE).map((entry) => {
      if (entry.toLowerCase() === "none") return null;
      const number = Number(entry);
      if (!Number.isFinite(number)) {
        throw new SyntaxError(`NRRDLoader: invalid spacing '${entry}'.`);
      }
      return number;
    }),
  );
}

/** Parses a comma-separated NRRD origin vector into numeric components. */
export function parseVector(
  value: string | undefined,
): readonly number[] | undefined {
  if (value === undefined) return;
  const match = RE_PARENS.exec(value);
  const inner = (match?.groups as { inner?: string } | undefined)?.inner;
  const components = (inner ?? value)
    .split(RE_COMMA_SPLIT)
    .map((entry) => Number(entry));
  if (components.some((component) => !Number.isFinite(component))) {
    throw new SyntaxError(`NRRDLoader: invalid space origin '${value}'.`);
  }
  return Object.freeze(components);
}

/** Derives positive voxel spacing from explicit or directional metadata. */
export function deriveSpacing(header: NRRDHeader): [number, number, number] {
  const output: [number, number, number] = [1, 1, 1];
  if (header.spacings) {
    for (let index = 0; index < 3; index++) {
      const spacing = header.spacings[index];
      if (
        spacing !== undefined &&
        spacing !== null &&
        Number.isFinite(spacing)
      ) {
        output[index] = Math.abs(spacing);
      }
    }
  }
  if (header.spaceDirections) {
    for (let index = 0; index < 3; index++) {
      const direction = header.spaceDirections[index];
      if (direction && header.spacings?.[index] === undefined) {
        output[index] = Math.hypot(direction[0], direction[1], direction[2]);
      }
    }
  }
  return output;
}

/** Derives x/y/z axis labels from NRRD space-direction vectors. */
export function deriveAxisOrder(
  header: NRRDHeader,
): [NRRDAxis, NRRDAxis, NRRDAxis] {
  const fallback: [NRRDAxis, NRRDAxis, NRRDAxis] = ["x", "y", "z"];
  const directions = header.spaceDirections;
  if (!directions || directions.length < 3) return fallback;
  const output: Array<NRRDAxis | undefined> = [undefined, undefined, undefined];
  for (let index = 0; index < 3; index++) {
    const direction = directions[index];
    if (!direction) continue;
    const axis = direction.reduce(
      (best, component, componentIndex) =>
        Math.abs(component) > Math.abs(direction[best] ?? 0)
          ? componentIndex
          : best,
      0,
    );
    const label = axisLabel(axis);
    if (!output.includes(label)) output[index] = label;
  }
  const a = output[0];
  const b = output[1];
  const c = output[2];
  if (a !== undefined && b !== undefined && c !== undefined) {
    return [a, b, c];
  }
  return fallback;
}

/** Computes the finite minimum and maximum values in a sample array. */
export function computeRange(data: NRRDDataArray): {
  min: number;
  max: number;
} {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of data) {
    if (Number.isNaN(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (min === Number.POSITIVE_INFINITY) return { min: 0, max: 0 };
  return { min, max };
}

/** Multiplies dimensions while rejecting unsafe sample counts. */
export function product(values: readonly number[]): number {
  let result = 1;
  for (const value of values) {
    result *= value;
    if (!Number.isSafeInteger(result)) {
      throw new RangeError(
        "NRRDLoader: volume sample count exceeds safe memory limits.",
      );
    }
  }
  return result;
}

/** Converts supported NRRD input forms into a byte view. */
export function toBytes(input: NRRDInput): Uint8Array {
  if (typeof input === "string") return new TextEncoder().encode(input);
  if (input instanceof Uint8Array) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(input);
}

/** Finds the byte offset immediately after an NRRD header separator. */
export function findHeaderEnd(bytes: Uint8Array): number {
  for (let index = 0; index < bytes.length - 1; index++) {
    if (bytes[index] === 10 && bytes[index + 1] === 10) return index + 2;
    if (
      bytes[index] === 13 &&
      bytes[index + 1] === 10 &&
      bytes[index + 2] === 13 &&
      bytes[index + 3] === 10
    ) {
      return index + 4;
    }
    if (
      bytes[index] === 10 &&
      bytes[index + 1] === 13 &&
      bytes[index + 2] === 10
    ) {
      return index + 3;
    }
  }
  return -1;
}

/** Converts an x, y, or z axis label to its numeric index. */
export function axisToIndex(axis: NRRDAxis): 0 | 1 | 2 {
  switch (axis) {
    case "x":
      return 0;
    case "y":
      return 1;
    case "z":
      return 2;
  }
}

/** Returns the default axis used when selecting volume slices. */
export function defaultSliceAxis(): "z" {
  return "z";
}

/** Normalizes packed or component color input to three unit channels. */
export function normalizeColor(
  color: number | readonly [number, number, number] | undefined,
): [number, number, number] {
  if (Array.isArray(color)) {
    return [
      clamp01(color[0] ?? 1),
      clamp01(color[1] ?? 1),
      clamp01(color[2] ?? 1),
    ];
  }
  if (typeof color !== "number") return [1, 1, 1];
  return [
    ((color >>> 16) & 0xff) / 255,
    ((color >>> 8) & 0xff) / 255,
    (color & 0xff) / 255,
  ];
}

/** Clamps a numeric color component to the inclusive unit interval. */
export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Clamps and rounds a numeric channel to an 8-bit value. */
export function clampByte(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}
