import { DataTexture } from "../textures/DataTexture.ts";
import { DataTextureLoader } from "./DataTextureLoader.ts";

const MAX_HEADER_BYTES = 1024 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024 * 1024;
const MAX_RLE_WIDTH = 0x7fff;
const MIN_RLE_WIDTH = 8;
const RGBA_CHANNELS = 4;
const INITIAL_TOKEN_PATTERN = /^#\?\S+/u;
const FORMAT_PATTERN = /^\s*FORMAT=(?<value>\S+)\s*$/u;
const GAMMA_PATTERN = /^\s*GAMMA\s*=\s*(?<value>\S+)\s*$/u;
const EXPOSURE_PATTERN = /^\s*EXPOSURE\s*=\s*(?<value>\S+)\s*$/u;
const DIMENSIONS_PATTERN =
  /^\s*(?<ySign>-|\+)Y\s+(?<height>\d+)\s+(?<xSign>-|\+)X\s+(?<width>\d+)\s*$/u;
const REINHARD_TONE_MAPPING = "reinhard";
const NO_TONE_MAPPING = "none";

/** Radiance RGBE payload formats supported by the bounded CPU decoder. */
export type HDRFormat = "32-bit_rgbe" | "32-bit_rle_rgbe";

/** Tone-mapping operators available for packed Canvas2D output. */
export type HDRToneMapping = "reinhard" | "none";

/** Options controlling exposure and tone mapping for decoded HDR pixels. */
export interface HDRTextureOptions {
  /** Multiplier applied to decoded linear samples before tone mapping. */
  readonly exposure?: number;
  /** Operator used to map linear samples into display-ready sRGB bytes. */
  readonly toneMapping?: HDRToneMapping;
}

/** Parsed Radiance RGBE pixels together with source metadata. */
export interface HDRParseResult {
  /** sRGB-encoded, tone-mapped RGBA bytes for a Canvas2D DataTexture. */
  readonly data: Uint8ClampedArray;
  /** Decoded image width in source pixels. */
  readonly width: number;
  /** Decoded image height in source pixels. */
  readonly height: number;
  /** Linear-light RGBE samples with an opaque alpha channel. */
  readonly linearData: Float32Array;
  /** Header text through the dimensions line. */
  readonly header: string;
  /** Positive source gamma metadata, defaulting to one when absent. */
  readonly gamma: number;
  /** Positive source exposure metadata, defaulting to one when absent. */
  readonly exposure: number;
  /** Radiance payload encoding used by the source image. */
  readonly format: HDRFormat;
}

/**
 * Parses Radiance RGBE/HDR byte streams into CPU-friendly image data.
 *
 * Flat `32-bit_rgbe` and scanline-RLE `32-bit_rle_rgbe` payloads are
 * decoded with their orientation metadata, converted to linear RGB samples,
 * and packed as
 * exposure-adjusted, tone-mapped sRGB RGBA bytes for `DataTexture`. Header
 * and output-size limits keep parsing and allocation bounded for Canvas2D use.
 */
export class HDRLoader extends DataTextureLoader {
  #exposure = 1;
  #toneMapping: HDRToneMapping = REINHARD_TONE_MAPPING;

  /** Current exposure multiplier used when parse options omit exposure. */
  get exposure(): number {
    return this.#exposure;
  }

  /** Sets the default exposure multiplier for future parses and conversions. */
  set exposure(value: number) {
    this.#exposure = assertExposure(value);
  }

  /** Alias for {@link HDRLoader.exposure} using THREE's terminology. */
  get toneMappingExposure(): number {
    return this.#exposure;
  }

  /** Sets the default exposure through the tone-mapping alias. */
  set toneMappingExposure(value: number) {
    this.#exposure = assertExposure(value);
  }

  /** Current operator used to convert linear samples into packed output. */
  get toneMapping(): HDRToneMapping {
    return this.#toneMapping;
  }

  /** Selects Reinhard or direct clamped tone mapping for packed output. */
  set toneMapping(value: HDRToneMapping) {
    if (value !== REINHARD_TONE_MAPPING && value !== NO_TONE_MAPPING) {
      throw new RangeError(
        'HDRLoader.toneMapping must be "reinhard" or "none".',
      );
    }
    this.#toneMapping = value;
  }

  /** Parses Radiance RGBE data and returns linear samples plus packed pixels. */
  override parse(
    buffer: ArrayBuffer | Uint8Array,
    options: HDRTextureOptions = {},
  ): HDRParseResult {
    const bytes = toBytes(buffer);
    const parsed = readHeader(bytes);
    const linearData = decodePixels(bytes, parsed);
    const exposure = options.exposure ?? this.#exposure;
    const toneMapping = options.toneMapping ?? this.#toneMapping;
    validateTextureOptions(exposure, toneMapping);
    return {
      data: toneMap(linearData, exposure, toneMapping),
      width: parsed.width,
      height: parsed.height,
      linearData,
      header: parsed.header,
      gamma: parsed.gamma,
      exposure: parsed.exposure,
      format: parsed.format,
    };
  }

  /** Creates a DataTexture from parsed samples, applying any supplied options. */
  toDataTexture(
    result: HDRParseResult,
    options: HDRTextureOptions = {},
  ): DataTexture {
    const hasOptions =
      options.exposure !== undefined || options.toneMapping !== undefined;
    const pixels = hasOptions
      ? toneMap(
          result.linearData,
          options.exposure ?? this.#exposure,
          options.toneMapping ?? this.#toneMapping,
        )
      : result.data;
    const texture = new DataTexture(pixels, result.width, result.height);
    texture.buildBrightnessLevels();
    return texture;
  }
}

/** Compatibility name used by THREE before HDRLoader was introduced. */
export const RGBELoader: typeof HDRLoader = HDRLoader;

type Sign = "-" | "+";
type HeaderGroups = {
  value?: string;
};
type DimensionsGroups = HeaderGroups & {
  width?: string;
  height?: string;
  xSign?: string;
  ySign?: string;
};
type Dimensions = readonly [number, number, Sign, Sign];
type HeaderState = [
  HDRFormat | undefined,
  number,
  number,
  Dimensions | undefined,
  string[],
];
type ParsedHeader = {
  readonly dataOffset: number;
  readonly width: number;
  readonly height: number;
  readonly xSign: Sign;
  readonly ySign: Sign;
  readonly header: string;
  readonly gamma: number;
  readonly exposure: number;
  readonly format: HDRFormat;
};
type DecodeOptions = {
  readonly dataOffset: number;
  readonly width: number;
  readonly height: number;
  readonly ySign: Sign;
  readonly xSign: Sign;
};
type PixelOptions = DecodeOptions & { readonly row: number };
type Pixel = readonly [number, number, number, number];
type RleOptions = {
  readonly cursor: number;
  readonly width: number;
  readonly channel: number;
  readonly scanline: Uint8Array;
};

function toBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (input instanceof Uint8Array) return input;
  throw new TypeError("HDRLoader.parse expects an ArrayBuffer or Uint8Array.");
}

function readHeader(bytes: Uint8Array): ParsedHeader {
  const state: HeaderState = [undefined, 1, 1, undefined, []];
  let offset = readInitialLine(bytes, state);
  while (offset < bytes.length && offset <= MAX_HEADER_BYTES) {
    const line = readLine(bytes, offset);
    offset = line.offset;
    state[4].push(line.value);
    if (line.value !== "" && parseHeaderLine(line.value, state)) break;
  }
  if (offset > MAX_HEADER_BYTES) {
    throw new Error("HDRLoader: Header exceeds the bounded decode limit.");
  }
  const [format, gamma, exposure, dimensions, lines] = state;
  if (format === undefined) {
    throw new Error("HDRLoader: Bad File Format: missing FORMAT specifier.");
  }
  if (dimensions === undefined) {
    throw new Error(
      "HDRLoader: Bad File Format: missing image size specifier.",
    );
  }
  const [width, height, xSign, ySign] = dimensions;
  const dataOffset =
    bytes[offset] === 10 && hasRleHeader(bytes, offset + 1, width)
      ? offset + 1
      : offset;
  return {
    dataOffset,
    width,
    height,
    xSign,
    ySign,
    header: `${lines.join("\n")}\n`,
    gamma,
    exposure,
    format,
  };
}

function readInitialLine(bytes: Uint8Array, state: HeaderState): number {
  const line = readLine(bytes, 0);
  state[4].push(line.value);
  if (!INITIAL_TOKEN_PATTERN.test(line.value)) {
    throw new Error("HDRLoader: Bad File Format: bad initial token.");
  }
  return line.offset;
}

function readLine(
  bytes: Uint8Array,
  offset: number,
): { readonly value: string; readonly offset: number } {
  let cursor = offset;
  while (cursor < bytes.length && bytes[cursor] !== 10) cursor++;
  if (cursor >= bytes.length) {
    throw new Error("HDRLoader: Header is missing a terminating newline.");
  }
  const line = decodeAscii(bytes.subarray(offset, cursor));
  return {
    value: line.endsWith("\r") ? line.slice(0, -1) : line,
    offset: cursor + 1,
  };
}

function parseHeaderLine(line: string, state: HeaderState): boolean {
  updateFormat(line, state);
  updateMetadata(line, state, GAMMA_PATTERN, 1);
  updateMetadata(line, state, EXPOSURE_PATTERN, 2);
  const groups = DIMENSIONS_PATTERN.exec(line)?.groups as
    | DimensionsGroups
    | undefined;
  if (groups === undefined) return false;
  const width = Number(groups.width);
  const height = Number(groups.height);
  if (!(Number.isSafeInteger(width) && Number.isSafeInteger(height))) {
    throw new Error("HDRLoader: Image dimensions are outside safe bounds.");
  }
  if (width <= 0 || height <= 0) {
    throw new Error("HDRLoader: Image dimensions must be positive.");
  }
  assertOutputSize(width, height);
  state[3] = [width, height, groups.xSign as Sign, groups.ySign as Sign];
  return true;
}

function updateFormat(line: string, state: HeaderState): void {
  const groups = FORMAT_PATTERN.exec(line)?.groups as HeaderGroups | undefined;
  const value = groups?.value;
  if (value === undefined) return;
  if (value !== "32-bit_rgbe" && value !== "32-bit_rle_rgbe") {
    throw new Error(`HDRLoader: Bad File Format: unsupported FORMAT=${value}.`);
  }
  state[0] = value;
}

function updateMetadata(
  line: string,
  state: HeaderState,
  pattern: RegExp,
  index: 1 | 2,
): void {
  const groups = pattern.exec(line)?.groups as HeaderGroups | undefined;
  const value = groups?.value;
  const number = Number(value);
  if (Number.isFinite(number) && number > 0) state[index] = number;
}

function decodeAscii(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return value;
}

function assertOutputSize(width: number, height: number): void {
  const pixelCount = width * height;
  if (
    !Number.isSafeInteger(pixelCount) ||
    pixelCount <= 0 ||
    pixelCount * RGBA_CHANNELS * (Float32Array.BYTES_PER_ELEMENT + 1) >
      MAX_OUTPUT_BYTES
  ) {
    throw new Error("HDRLoader: Image is too large for CPU decoding.");
  }
}

function decodePixels(bytes: Uint8Array, options: DecodeOptions): Float32Array {
  const { dataOffset, width, height } = options;
  const data = new Float32Array(width * height * RGBA_CHANNELS);
  const rle = hasRleHeader(bytes, dataOffset, width);
  const scanline = rle ? new Uint8Array(width * RGBA_CHANNELS) : undefined;
  let offset = dataOffset;
  for (let row = 0; row < height; row++) {
    const pixelOptions = { ...options, row };
    if (rle) {
      if (scanline === undefined) {
        throw new Error("HDRLoader: Missing scanline.");
      }
      offset = decodeRleScanline(bytes, offset, width, scanline);
      writeScanline(data, scanline, pixelOptions);
    } else {
      const rowBytes = width * RGBA_CHANNELS;
      if (offset + rowBytes > bytes.length) {
        throw new Error("HDRLoader: Truncated pixel data.");
      }
      writeFlatScanline(data, bytes, offset, pixelOptions);
      offset += rowBytes;
    }
  }
  return data;
}

function writeFlatScanline(
  data: Float32Array,
  bytes: Uint8Array,
  offset: number,
  options: PixelOptions,
): void {
  const { width } = options;
  for (let column = 0; column < width; column++) {
    const source = offset + column * RGBA_CHANNELS;
    writePixel(
      data,
      [
        bytes[source] ?? 0,
        bytes[source + 1] ?? 0,
        bytes[source + 2] ?? 0,
        bytes[source + 3] ?? 0,
      ],
      options,
      column,
    );
  }
}

function writeScanline(
  data: Float32Array,
  scanline: Uint8Array,
  options: PixelOptions,
): void {
  const { width } = options;
  for (let column = 0; column < width; column++) {
    writePixel(
      data,
      [
        scanline[column] ?? 0,
        scanline[width + column] ?? 0,
        scanline[2 * width + column] ?? 0,
        scanline[3 * width + column] ?? 0,
      ],
      options,
      column,
    );
  }
}

function hasRleHeader(
  bytes: Uint8Array,
  offset: number,
  width: number,
): boolean {
  return (
    width >= MIN_RLE_WIDTH &&
    width <= MAX_RLE_WIDTH &&
    offset + 4 <= bytes.length &&
    bytes[offset] === 2 &&
    bytes[offset + 1] === 2 &&
    bytes[offset + 2] === width >> 8 &&
    bytes[offset + 3] === (width & 255)
  );
}

function decodeRleScanline(
  bytes: Uint8Array,
  offset: number,
  width: number,
  scanline: Uint8Array,
): number {
  if (!hasRleHeader(bytes, offset, width)) {
    throw new Error("HDRLoader: Bad RLE scanline header.");
  }
  let cursor = offset + 4;
  for (let channel = 0; channel < RGBA_CHANNELS; channel++) {
    cursor = decodeRleChannel(bytes, { cursor, width, channel, scanline });
  }
  return cursor;
}

function decodeRleChannel(bytes: Uint8Array, options: RleOptions): number {
  let cursor = options.cursor;
  let position = 0;
  while (position < options.width) {
    if (cursor >= bytes.length) {
      throw new Error("HDRLoader: Truncated scanline data.");
    }
    const control = bytes[cursor++];
    if (control === 0) {
      throw new Error("HDRLoader: Bad scanline data.");
    }
    const count = control > 128 ? control - 128 : control;
    if (
      position + count > options.width ||
      cursor + (control > 128 ? 1 : count) > bytes.length
    ) {
      throw new Error("HDRLoader: Bad scanline data.");
    }
    const start = options.channel * options.width + position;
    if (control > 128) {
      options.scanline.fill(bytes[cursor++] ?? 0, start, start + count);
    } else {
      options.scanline.set(bytes.subarray(cursor, cursor + count), start);
      cursor += count;
    }
    position += count;
  }
  return cursor;
}

function writePixel(
  data: Float32Array,
  pixel: Pixel,
  options: PixelOptions,
  column: number,
): void {
  const { width, height, row, ySign, xSign } = options;
  const targetRow = ySign === "-" ? row : height - row - 1;
  const targetColumn = xSign === "+" ? column : width - column - 1;
  const offset = (targetRow * width + targetColumn) * RGBA_CHANNELS;
  const [red, green, blue, exponent] = pixel;
  if (exponent === 0) {
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
  } else {
    const scale = 2 ** (exponent - 128) / 255;
    data[offset] = red * scale;
    data[offset + 1] = green * scale;
    data[offset + 2] = blue * scale;
  }
  data[offset + 3] = 1;
}

function assertExposure(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      "HDRLoader exposure must be a finite non-negative number.",
    );
  }
  return value;
}

function validateTextureOptions(
  exposure: number,
  toneMapping: HDRToneMapping,
): void {
  assertExposure(exposure);
  if (
    toneMapping !== REINHARD_TONE_MAPPING &&
    toneMapping !== NO_TONE_MAPPING
  ) {
    throw new RangeError('HDRLoader toneMapping must be "reinhard" or "none".');
  }
}

function toneMap(
  linearData: Float32Array,
  exposure: number,
  toneMapping: HDRToneMapping,
): Uint8ClampedArray {
  validateTextureOptions(exposure, toneMapping);
  const pixels = new Uint8ClampedArray(linearData.length);
  for (let offset = 0; offset < linearData.length; offset += RGBA_CHANNELS) {
    for (let channel = 0; channel < 3; channel++) {
      const linear = Math.max(
        0,
        (linearData[offset + channel] ?? 0) * exposure,
      );
      const mapped =
        toneMapping === REINHARD_TONE_MAPPING
          ? linear / (1 + linear)
          : Math.min(1, linear);
      pixels[offset + channel] = Math.round(linearToSrgb(mapped) * 255);
    }
    pixels[offset + 3] = 255;
  }
  return pixels;
}

function linearToSrgb(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped <= 0.0031308
    ? clamped * 12.92
    : 1.055 * clamped ** (1 / 2.4) - 0.055;
}
