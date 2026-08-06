import { DataTexture } from "../textures/DataTexture.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

/** Scalar NRRD sample types supported by the CPU decoder. */
export type NRRDScalarType =
  | "uint8"
  | "int8"
  | "uint16"
  | "int16"
  | "uint32"
  | "int32"
  | "float32"
  | "float64";

/** Payload encodings decoded without a compression or GPU dependency. */
export type NRRDEncoding = "raw" | "ascii" | "hex";

/** Axis names accepted by {@link NRRDVolume.slice}. */
export type NRRDAxis = "x" | "y" | "z";

/** Typed scalar array returned by the NRRD CPU decoder. */
export type NRRDDataArray =
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array;

/** Parsed NRRD header fields and source metadata. */
export interface NRRDHeader {
  /** Original NRRD magic line, for example `NRRD0005`. */
  readonly magic: string;
  /** Numeric NRRD format version from the magic line. */
  readonly version: number;
  /** Number of scalar axes in the source payload. */
  readonly dimension: number;
  /** Scalar sample count along each source axis. */
  readonly sizes: readonly number[];
  /** Canonical scalar sample type used by {@link NRRDVolume.data}. */
  readonly type: NRRDScalarType;
  /** Canonical payload encoding. */
  readonly encoding: NRRDEncoding;
  /** Byte order used by a raw multi-byte payload. */
  readonly endian: "little" | "big" | undefined;
  /** Optional coordinate-space name from the source. */
  readonly space: string | undefined;
  /** Optional coordinate-space dimensionality. */
  readonly spaceDimension: number | undefined;
  /** Optional direction vectors, with `null` for non-spatial axes. */
  readonly spaceDirections:
    | readonly (readonly [number, number, number] | null)[]
    | undefined;
  /** Optional physical spacing per source axis. */
  readonly spacings: readonly (number | null)[] | undefined;
  /** Optional physical origin from the source. */
  readonly spaceOrigin: readonly number[] | undefined;
  /** All recognized and unrecognized source fields, keyed case-insensitively. */
  readonly metadata: Readonly<Record<string, string>>;
}

/** A scalar image plane extracted from a one-, two-, or three-dimensional volume. */
export interface NRRDSlice {
  /** Normal axis used to extract this plane. */
  readonly axis: NRRDAxis;
  /** Zero-based source index along the normal axis. */
  readonly index: number;
  /** Plane width in source samples. */
  readonly width: number;
  /** Plane height in source samples. */
  readonly height: number;
  /** Row-major scalar samples; x changes fastest within each row. */
  readonly data: NRRDDataArray;
  /** Minimum finite sample value in this plane. */
  readonly min: number;
  /** Maximum finite sample value in this plane. */
  readonly max: number;
}

/** Options controlling conversion of a scalar slice to bounded RGBA pixels. */
export interface NRRDTextureOptions {
  /** Lower scalar value mapped to zero intensity; defaults to the volume minimum. */
  readonly min?: number;
  /** Upper scalar value mapped to full intensity; defaults to the volume maximum. */
  readonly max?: number;
  /** Optional RGB multiplier in normalized [0, 1] channels or a packed hex color. */
  readonly color?: number | readonly [number, number, number];
  /** Optional alpha in normalized [0, 1] units. */
  readonly alpha?: number;
  /** Optional display name assigned to the generated texture. */
  readonly name?: string;
}

/** Input accepted by {@link NRRDLoader.parse}. */
export type NRRDInput = string | ArrayBuffer | Uint8Array;

/**
 * CPU representation of an NRRD scalar volume.
 *
 * Data uses NRRD's x-fastest order: `x + sizeX * (y + sizeY * z)`. The
 * representation never allocates a WebGL/WebGPU resource. `toDataTexture`
 * creates a bounded nearest-neighbour RGBA texture for Canvas2D sampling.
 */
export class NRRDVolume {
  /** Parsed header and source metadata. */
  readonly header: NRRDHeader;
  /** Scalar samples in NRRD x-fastest order. */
  readonly data: NRRDDataArray;
  /** Source dimensions, preserving the header's one-, two-, or three-axis shape. */
  readonly dimensions: readonly number[];
  /** Number of samples along the x axis, defaulting to one for lower dimensions. */
  readonly xLength: number;
  /** Number of samples along the y axis, defaulting to one for one-dimensional data. */
  readonly yLength: number;
  /** Number of samples along the z axis, defaulting to one for lower dimensions. */
  readonly zLength: number;
  /** Alias for the source spacing values, padded with unit spacing. */
  readonly spacing: readonly [number, number, number];
  /** Axis labels retained from the source direction metadata. */
  readonly axisOrder: readonly [NRRDAxis, NRRDAxis, NRRDAxis];
  /** All source fields, including fields not interpreted by the decoder. */
  readonly metadata: Readonly<Record<string, string>>;
  /** Minimum finite scalar value in the volume. */
  readonly min: number;
  /** Maximum finite scalar value in the volume. */
  readonly max: number;
  /** Three.js-compatible lower window bound alias. */
  readonly windowLow: number;
  /** Three.js-compatible upper window bound alias. */
  readonly windowHigh: number;

  /** Constructs a validated CPU volume from parsed header and scalar samples. */
  constructor(header: NRRDHeader, data: NRRDDataArray) {
    const expectedLength = product(header.sizes);
    if (data.length !== expectedLength) {
      throw new RangeError(
        `NRRDVolume data length ${data.length} does not match ${expectedLength} samples.`,
      );
    }
    this.header = header;
    this.data = data;
    this.dimensions = Object.freeze([...header.sizes]);
    this.xLength = header.sizes[0] ?? 1;
    this.yLength = header.sizes[1] ?? 1;
    this.zLength = header.sizes[2] ?? 1;
    this.spacing = deriveSpacing(header);
    this.axisOrder = deriveAxisOrder(header);
    this.metadata = header.metadata;
    const range = computeRange(data);
    this.min = range.min;
    this.max = range.max;
    this.windowLow = range.min;
    this.windowHigh = range.max;
  }

  /** Returns the flat data index for x, y, and z coordinates. */
  access(x: number, y = 0, z = 0): number {
    this.#validateCoordinate(x, this.xLength, "x");
    this.#validateCoordinate(y, this.yLength, "y");
    this.#validateCoordinate(z, this.zLength, "z");
    return z * this.xLength * this.yLength + y * this.xLength + x;
  }

  /** Returns one scalar sample at x, y, and z coordinates. */
  getData(x: number, y = 0, z = 0): number {
    return this.data[this.access(x, y, z)] ?? 0;
  }

  /** Returns x, y, and z coordinates for a flat sample index. */
  reverseAccess(index: number): [number, number, number] {
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= this.data.length
    ) {
      throw new RangeError("NRRDVolume index is outside the scalar data.");
    }
    const planeSize = this.xLength * this.yLength;
    const z = Math.floor(index / planeSize);
    const remainder = index - z * planeSize;
    const y = Math.floor(remainder / this.xLength);
    return [remainder - y * this.xLength, y, z];
  }

  /** Extracts a row-major scalar plane perpendicular to the requested axis. */
  slice(axis: NRRDAxis = defaultSliceAxis(), index = 0): NRRDSlice {
    const axisIndex = axisToIndex(axis);
    const axisLength = this.#axisLength(axisIndex);
    if (!Number.isSafeInteger(index) || index < 0 || index >= axisLength) {
      throw new RangeError(
        `NRRDVolume ${axis}-slice index must be an integer from 0 through ${axisLength - 1}.`,
      );
    }
    const width = axisIndex === 0 ? this.yLength : this.xLength;
    const height = axisIndex === 2 ? this.yLength : this.zLength;
    const planeWidth = axisIndex === 0 ? this.yLength : this.xLength;
    const planeHeight = axisIndex === 2 ? this.yLength : this.zLength;
    const output = createDataArray(this.header.type, planeWidth * planeHeight);
    let outputIndex = 0;
    for (let row = 0; row < planeHeight; row++) {
      for (let column = 0; column < planeWidth; column++) {
        let x = column;
        let y = row;
        let z = index;
        if (axisIndex === 0) {
          x = index;
          y = column;
          z = row;
        } else if (axisIndex === 1) {
          x = column;
          y = index;
          z = row;
        }
        output[outputIndex++] = this.data[this.access(x, y, z)] ?? 0;
      }
    }
    const range = computeRange(output);
    return {
      axis,
      index,
      width,
      height,
      data: output,
      min: range.min,
      max: range.max,
    };
  }

  /**
   * Converts one scalar plane to a nearest-neighbour RGBA DataTexture.
   * Dimensions are capped at EASEL's 128x128 CPU texture limit by sampling
   * the source plane across the bounded output.
   */
  toDataTexture(
    axis: NRRDAxis = defaultSliceAxis(),
    index = 0,
    options: NRRDTextureOptions = {},
  ): DataTexture {
    const plane = this.slice(axis, index);
    const width = Math.min(128, plane.width);
    const height = Math.min(128, plane.height);
    const pixels = new Uint8ClampedArray(width * height * 4);
    const lower = options.min ?? this.min;
    const upper = options.max ?? this.max;
    const span = upper - lower;
    const [red, green, blue] = normalizeColor(options.color);
    const alpha = clampByte((options.alpha ?? 1) * 255);
    for (let row = 0; row < height; row++) {
      const sourceRow = Math.min(
        plane.height - 1,
        Math.floor((row * plane.height) / height),
      );
      for (let column = 0; column < width; column++) {
        const sourceColumn = Math.min(
          plane.width - 1,
          Math.floor((column * plane.width) / width),
        );
        const sample = plane.data[sourceRow * plane.width + sourceColumn] ?? 0;
        const normalized = span > 0 ? clamp01((sample - lower) / span) : 1;
        const target = (row * width + column) * 4;
        pixels[target] = clampByte(normalized * red * 255);
        pixels[target + 1] = clampByte(normalized * green * 255);
        pixels[target + 2] = clampByte(normalized * blue * 255);
        pixels[target + 3] = alpha;
      }
    }
    const texture = new DataTexture(pixels, width, height);
    texture.name = options.name ?? `NRRD ${axis}-slice ${index}`;
    texture.buildBrightnessLevels();
    return texture;
  }

  /** Alias for {@link NRRDVolume.toDataTexture}. */
  toTexture(
    axis: NRRDAxis = defaultSliceAxis(),
    index = 0,
    options: NRRDTextureOptions = {},
  ): DataTexture {
    return this.toDataTexture(axis, index, options);
  }

  #axisLength(axisIndex: 0 | 1 | 2): number {
    return axisIndex === 0
      ? this.xLength
      : axisIndex === 1
        ? this.yLength
        : this.zLength;
  }

  #validateCoordinate(value: number, length: number, label: string): void {
    if (!Number.isSafeInteger(value) || value < 0 || value >= length) {
      throw new RangeError(
        `NRRDVolume ${label} coordinate is outside the data.`,
      );
    }
  }
}

/** Loads NRRD scalar volumes into a deterministic CPU representation. */
export class NRRDLoader extends Loader {
  /** Loads an NRRD resource through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (volume: NRRDVolume) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
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
        }
      },
      onProgress,
      onError,
    );
  }

  /** Parses an NRRD header and raw, ASCII, or hexadecimal scalar payload. */
  parse(input: NRRDInput): NRRDVolume {
    const bytes = toBytes(input);
    const headerEnd = findHeaderEnd(bytes);
    if (headerEnd < 0) {
      throw new SyntaxError("NRRDLoader: missing blank line after the header.");
    }
    const header = parseHeader(bytes.subarray(0, headerEnd));
    const count = product(header.sizes);
    const data = decodePayload(bytes.subarray(headerEnd), header, count);
    return new NRRDVolume(header, data);
  }
}

interface NRRDTypeInfo {
  readonly type: NRRDScalarType;
  readonly bytes: 1 | 2 | 4 | 8;
}

const typeInfo: Record<NRRDScalarType, NRRDTypeInfo> = {
  uint8: { type: "uint8", bytes: 1 },
  int8: { type: "int8", bytes: 1 },
  uint16: { type: "uint16", bytes: 2 },
  int16: { type: "int16", bytes: 2 },
  uint32: { type: "uint32", bytes: 4 },
  int32: { type: "int32", bytes: 4 },
  float32: { type: "float32", bytes: 4 },
  float64: { type: "float64", bytes: 8 },
};

const typeAliases: Record<string, NRRDScalarType> = {
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

function parseHeader(bytes: Uint8Array): NRRDHeader {
  const text = new TextDecoder().decode(bytes).replace(/^\uFEFF/u, "");
  const lines = text.split(/\r\n|\n|\r/u);
  const magic = lines.shift()?.trim() ?? "";
  if (!/^NRRD\d+$/u.test(magic)) {
    throw new SyntaxError("NRRDLoader: input is not an NRRD file.");
  }
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

function decodePayload(
  payload: Uint8Array,
  header: NRRDHeader,
  count: number,
): NRRDDataArray {
  if (header.encoding === "raw") {
    return decodeRaw(payload, header, count);
  }
  const text = new TextDecoder().decode(payload).replace(/#.*$/gmu, " ");
  const tokens = text.trim() ? text.trim().split(/\s+/u) : [];
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

function decodeRaw(
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

function readValue(
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

function createDataArray(type: NRRDScalarType, length: number): NRRDDataArray {
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

function parseTextSample(
  token: string,
  type: NRRDScalarType,
  encoding: "ascii" | "hex",
): number {
  if (encoding === "ascii" || type === "float32" || type === "float64") {
    return Number(token);
  }
  const normalized = token.toLowerCase().replace(/^0x/u, "");
  if (!(normalized && /^[+-]?[0-9a-f]+$/u.test(normalized))) return Number.NaN;
  return Number.parseInt(normalized, 16);
}

function parseEncoding(value: string | undefined): NRRDEncoding {
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

function parseEndian(value: string | undefined): "little" | "big" | undefined {
  if (value === undefined || value === "") return;
  const normalized = value.toLowerCase();
  if (normalized === "little" || normalized === "big") return normalized;
  throw new Error(`NRRDLoader: unsupported endian '${value}'.`);
}

function parsePositiveInteger(value: string | undefined, name: string): number {
  const number = value === undefined ? Number.NaN : Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new SyntaxError(`NRRDLoader: ${name} must be a positive integer.`);
  }
  return number;
}

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function parseSizes(value: string | undefined, dimension: number): number[] {
  if (!value) throw new SyntaxError("NRRDLoader: sizes field is required.");
  const sizes = value.split(/\s+/u).map((entry) => Number(entry));
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

function parseDirections(
  value: string | undefined,
): readonly (readonly [number, number, number] | null)[] | undefined {
  if (value === undefined) return;
  const entries = value.match(/none|\([^)]*\)/giu) ?? [];
  return Object.freeze(
    entries.map((entry) => {
      if (entry.toLowerCase() === "none") return null;
      const components = entry
        .slice(1, -1)
        .split(/\s*,\s*/u)
        .map((component) => Number(component));
      if (
        components.length !== 3 ||
        components.some((component) => !Number.isFinite(component))
      ) {
        throw new SyntaxError(
          `NRRDLoader: invalid space direction '${entry}'.`,
        );
      }
      return Object.freeze([components[0]!, components[1]!, components[2]!] as [
        number,
        number,
        number,
      ]);
    }),
  );
}

function parseSpacings(
  value: string | undefined,
): readonly (number | null)[] | undefined {
  if (value === undefined) return;
  return Object.freeze(
    value.split(/\s+/u).map((entry) => {
      if (entry.toLowerCase() === "none") return null;
      const number = Number(entry);
      if (!Number.isFinite(number)) {
        throw new SyntaxError(`NRRDLoader: invalid spacing '${entry}'.`);
      }
      return number;
    }),
  );
}

function parseVector(value: string | undefined): readonly number[] | undefined {
  if (value === undefined) return;
  const match = /\(([^)]*)\)/u.exec(value);
  const components = (match?.[1] ?? value)
    .split(/\s*,\s*/u)
    .map((entry) => Number(entry));
  if (components.some((component) => !Number.isFinite(component))) {
    throw new SyntaxError(`NRRDLoader: invalid space origin '${value}'.`);
  }
  return Object.freeze(components);
}

function deriveSpacing(header: NRRDHeader): [number, number, number] {
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

function deriveAxisOrder(header: NRRDHeader): [NRRDAxis, NRRDAxis, NRRDAxis] {
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
    const label = axis === 0 ? "x" : axis === 1 ? "y" : "z";
    if (!output.includes(label)) output[index] = label;
  }
  return output.every((value): value is NRRDAxis => value !== undefined)
    ? [output[0]!, output[1]!, output[2]!]
    : fallback;
}

function computeRange(data: NRRDDataArray): { min: number; max: number } {
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

function product(values: readonly number[]): number {
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

function toBytes(input: NRRDInput): Uint8Array {
  if (typeof input === "string") return new TextEncoder().encode(input);
  if (input instanceof Uint8Array) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(input);
}

function findHeaderEnd(bytes: Uint8Array): number {
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

function axisToIndex(axis: NRRDAxis): 0 | 1 | 2 {
  switch (axis) {
    case "x":
      return 0;
    case "y":
      return 1;
    case "z":
      return 2;
  }
}

function defaultSliceAxis(): "z" {
  return "z";
}

function normalizeColor(
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampByte(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}
