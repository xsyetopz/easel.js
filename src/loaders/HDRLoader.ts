import { DataTexture } from "../textures/DataTexture.ts";
import { DataTextureLoader } from "./DataTextureLoader.ts";

const MAX_HEADER_BYTES = 1024 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024 * 1024;
const MAX_RLE_WIDTH = 0x7fff;
const MIN_RLE_WIDTH = 8;
const RGBA_CHANNELS = 4;
const REINHARD_TONE_MAPPING = "reinhard";
const NO_TONE_MAPPING = "none";

/** Radiance RGBE payload formats decoded by the CPU loader. */
export type HDRFormat = "32-bit_rgbe" | "32-bit_rle_rgbe";

/** Tone-mapping operators available for packed Canvas2D output. */
export type HDRToneMapping = "reinhard" | "none";

/** Options used when converting decoded HDR samples to display bytes. */
export interface HDRTextureOptions {
  /** Exposure multiplier applied before tone mapping; defaults to one. */
  readonly exposure?: number;
  /** Tone-mapping operator; defaults to Reinhard. */
  readonly toneMapping?: HDRToneMapping;
}

/** Parsed Radiance RGBE pixels and source metadata. */
export interface HDRParseResult {
  /** sRGB-encoded, tonemapped RGBA bytes for a Canvas2D DataTexture. */
  readonly data: Uint8ClampedArray;
  /** Decoded image width in source pixels. */
  readonly width: number;
  /** Decoded image height in source pixels. */
  readonly height: number;
  /** Linear-light RGBE samples with an opaque alpha channel. */
  readonly linearData: Float32Array;
  /** Header text through the dimensions line. */
  readonly header: string;
  /** Optional source gamma metadata, defaulting to one. */
  readonly gamma: number;
  /** Optional source exposure metadata, defaulting to one. */
  readonly exposure: number;
  /** Source Radiance payload format. */
  readonly format: HDRFormat;
}

/**
 * Decodes Radiance RGBE/HDR images to bounded CPU Canvas2D textures.
 *
 * Flat and scanline-RLE payloads are converted to linear RGB samples, then
 * exposure and Reinhard tone mapping produce packed sRGB RGBA bytes. No GPU
 * texture, environment map, or PMREM resource is allocated.
 */
export class HDRLoader extends DataTextureLoader {
  #exposure = 1;
  #toneMapping: HDRToneMapping = REINHARD_TONE_MAPPING;

  /** Exposure multiplier applied to decoded linear samples. */
  get exposure(): number {
    return this.#exposure;
  }

  /** Sets the exposure multiplier used by {@link HDRLoader.parse}. */
  set exposure(value: number) {
    this.#exposure = assertExposure(value);
  }

  /** Alias matching THREE's tone-mapping exposure terminology. */
  get toneMappingExposure(): number {
    return this.#exposure;
  }

  /** Sets the exposure multiplier used by the CPU tone mapper. */
  set toneMappingExposure(value: number) {
    this.#exposure = assertExposure(value);
  }

  /** Tone-mapping operator used for packed output. */
  get toneMapping(): HDRToneMapping {
    return this.#toneMapping;
  }

  /** Selects Reinhard or direct clamped tone mapping. */
  set toneMapping(value: HDRToneMapping) {
    if (value !== REINHARD_TONE_MAPPING && value !== NO_TONE_MAPPING) {
      throw new RangeError(
        'HDRLoader.toneMapping must be "reinhard" or "none".',
      );
    }
    this.#toneMapping = value;
  }

  /** Parses flat or scanline-RLE Radiance RGBE data. */
  override parse(
    buffer: ArrayBuffer | Uint8Array,
    options: HDRTextureOptions = {},
  ): HDRParseResult {
    const bytes = toBytes(buffer);
    const parsed = readHeader(bytes);
    const linearData = decodePixels(
      bytes,
      parsed.dataOffset,
      parsed.width,
      parsed.height,
      parsed.ySign,
      parsed.xSign,
    );
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

  /** Converts decoded linear samples into a bounded CPU DataTexture. */
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
export class RGBELoader extends HDRLoader {}

interface ParsedHeader {
  readonly dataOffset: number;
  readonly width: number;
  readonly height: number;
  readonly xSign: "-" | "+";
  readonly ySign: "-" | "+";
  readonly header: string;
  readonly gamma: number;
  readonly exposure: number;
  readonly format: HDRFormat;
}

function toBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (input instanceof Uint8Array) return input;
  throw new TypeError("HDRLoader.parse expects an ArrayBuffer or Uint8Array.");
}

function readHeader(bytes: Uint8Array): ParsedHeader {
  let offset = 0;
  let firstLine = true;
  let format: HDRFormat | undefined;
  let gamma = 1;
  let exposure = 1;
  let dimensions:
    | {
        width: number;
        height: number;
        xSign: "-" | "+";
        ySign: "-" | "+";
      }
    | undefined;
  const lines: string[] = [];

  while (offset < bytes.length && offset <= MAX_HEADER_BYTES) {
    const lineStart = offset;
    while (offset < bytes.length && bytes[offset] !== 10) offset++;
    if (offset >= bytes.length) {
      throw new Error("HDRLoader: Header is missing a terminating newline.");
    }
    const line = decodeAscii(bytes.subarray(lineStart, offset));
    offset++;
    lines.push(line.endsWith("\r") ? line.slice(0, -1) : line);

    const current = lines[lines.length - 1] ?? "";
    if (firstLine) {
      firstLine = false;
      if (!/^#\?\S+/u.test(current)) {
        throw new Error("HDRLoader: Bad File Format: bad initial token.");
      }
      continue;
    }
    if (current === "") continue;

    const formatMatch = current.match(/^\s*FORMAT=(\S+)\s*$/u);
    if (formatMatch) {
      const value = formatMatch[1];
      if (value !== "32-bit_rgbe" && value !== "32-bit_rle_rgbe") {
        throw new Error(
          `HDRLoader: Bad File Format: unsupported FORMAT=${value}.`,
        );
      }
      format = value;
    }
    const gammaMatch = current.match(/^\s*GAMMA\s*=\s*(\S+)\s*$/u);
    if (gammaMatch) {
      const value = Number(gammaMatch[1]);
      if (Number.isFinite(value) && value > 0) gamma = value;
    }
    const exposureMatch = current.match(/^\s*EXPOSURE\s*=\s*(\S+)\s*$/u);
    if (exposureMatch) {
      const value = Number(exposureMatch[1]);
      if (Number.isFinite(value) && value > 0) exposure = value;
    }
    const dimensionsMatch = current.match(
      /^\s*(-|\+)Y\s+(\d+)\s+(-|\+)X\s+(\d+)\s*$/u,
    );
    if (dimensionsMatch) {
      const height = Number(dimensionsMatch[2]);
      const width = Number(dimensionsMatch[4]);
      if (!(Number.isSafeInteger(width) && Number.isSafeInteger(height))) {
        throw new Error("HDRLoader: Image dimensions are outside safe bounds.");
      }
      if (width <= 0 || height <= 0) {
        throw new Error("HDRLoader: Image dimensions must be positive.");
      }
      assertOutputSize(width, height);
      dimensions = {
        width,
        height,
        xSign: dimensionsMatch[3] as "-" | "+",
        ySign: dimensionsMatch[1] as "-" | "+",
      };
      break;
    }
  }

  if (offset > MAX_HEADER_BYTES) {
    throw new Error("HDRLoader: Header exceeds the bounded decode limit.");
  }
  if (firstLine) throw new Error("HDRLoader: Header is missing.");
  if (format === undefined) {
    throw new Error("HDRLoader: Bad File Format: missing FORMAT specifier.");
  }
  if (dimensions === undefined) {
    throw new Error(
      "HDRLoader: Bad File Format: missing image size specifier.",
    );
  }

  offset = consumeSeparator(bytes, offset, dimensions.width);

  return {
    dataOffset: offset,
    width: dimensions.width,
    height: dimensions.height,
    xSign: dimensions.xSign,
    ySign: dimensions.ySign,
    header: `${lines.join("\n")}\n`,
    gamma,
    exposure,
    format,
  };
}

function consumeSeparator(
  bytes: Uint8Array,
  offset: number,
  width: number,
): number {
  if (bytes[offset] !== 10) return offset;
  if (hasRleHeader(bytes, offset + 1, width)) return offset + 1;
  return offset;
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

function decodePixels(
  bytes: Uint8Array,
  offset: number,
  width: number,
  height: number,
  ySign: "-" | "+",
  xSign: "-" | "+",
): Float32Array {
  const linearData = new Float32Array(width * height * RGBA_CHANNELS);
  const rle = hasRleHeader(bytes, offset, width);
  const scanline = rle ? new Uint8Array(width * RGBA_CHANNELS) : undefined;

  for (let row = 0; row < height; row++) {
    if (rle) {
      if (scanline === undefined)
        throw new Error("HDRLoader: Missing scanline.");
      offset = decodeRleScanline(bytes, offset, width, scanline);
      writeScanline(linearData, scanline, width, row, height, ySign, xSign);
      continue;
    }
    const rowBytes = width * RGBA_CHANNELS;
    if (offset + rowBytes > bytes.length) {
      throw new Error("HDRLoader: Truncated pixel data.");
    }
    for (let column = 0; column < width; column++) {
      const source = offset + column * RGBA_CHANNELS;
      writePixel(
        linearData,
        bytes[source] ?? 0,
        bytes[source + 1] ?? 0,
        bytes[source + 2] ?? 0,
        bytes[source + 3] ?? 0,
        width,
        height,
        row,
        column,
        ySign,
        xSign,
      );
    }
    offset += rowBytes;
  }
  return linearData;
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
    let position = 0;
    while (position < width) {
      if (cursor >= bytes.length)
        throw new Error("HDRLoader: Truncated scanline data.");
      const control = bytes[cursor++];
      if (control === 0) throw new Error("HDRLoader: Bad scanline data.");
      if (control > 128) {
        const count = control - 128;
        if (count === 0 || position + count > width || cursor >= bytes.length) {
          throw new Error("HDRLoader: Bad scanline data.");
        }
        const value = bytes[cursor++];
        scanline.fill(
          value,
          channel * width + position,
          channel * width + position + count,
        );
        position += count;
        continue;
      }
      if (position + control > width || cursor + control > bytes.length) {
        throw new Error("HDRLoader: Bad scanline data.");
      }
      scanline.set(
        bytes.subarray(cursor, cursor + control),
        channel * width + position,
      );
      cursor += control;
      position += control;
    }
  }
  return cursor;
}

function writeScanline(
  linearData: Float32Array,
  scanline: Uint8Array,
  width: number,
  row: number,
  height: number,
  ySign: "-" | "+",
  xSign: "-" | "+",
): void {
  for (let column = 0; column < width; column++) {
    writePixel(
      linearData,
      scanline[column] ?? 0,
      scanline[width + column] ?? 0,
      scanline[2 * width + column] ?? 0,
      scanline[3 * width + column] ?? 0,
      width,
      height,
      row,
      column,
      ySign,
      xSign,
    );
  }
}

function writePixel(
  linearData: Float32Array,
  red: number,
  green: number,
  blue: number,
  exponent: number,
  width: number,
  height: number,
  row: number,
  column: number,
  ySign: "-" | "+",
  xSign: "-" | "+",
): void {
  const targetRow = ySign === "-" ? row : height - row - 1;
  const targetColumn = xSign === "+" ? column : width - column - 1;
  const offset = (targetRow * width + targetColumn) * RGBA_CHANNELS;
  if (exponent === 0) {
    linearData[offset] = 0;
    linearData[offset + 1] = 0;
    linearData[offset + 2] = 0;
  } else {
    const scale = 2 ** (exponent - 128) / 255;
    linearData[offset] = red * scale;
    linearData[offset + 1] = green * scale;
    linearData[offset + 2] = blue * scale;
  }
  linearData[offset + 3] = 1;
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
