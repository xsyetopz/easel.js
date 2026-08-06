import type { DataTexture } from "../textures/DataTexture.ts";
import { writeEXRScanlines } from "./EXRScanlineWriter.ts";

/** Pixel storage accepted by the CPU EXR writer. */
export type EXRPixelArray =
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Float32Array;

/** Raw RGBA source accepted by {@link EXRExporter}. */
export interface EXRPixelSource {
  /** Interleaved RGBA samples in row-major order. */
  readonly data: EXRPixelArray;
  /** Number of pixels per row. */
  readonly width: number;
  /** Number of rows. */
  readonly height: number;
  /** How 16-bit samples are interpreted. Byte and float arrays are inferred. */
  readonly type?: "uint8" | "half" | "float";
}

/** Compression supported by the deterministic Canvas2D EXR writer. */
export type EXRCompression = "none";

/** Options controlling deterministic scanline EXR output. */
export interface EXRExporterOptions {
  /** Scanline compression. ZIP/ZIPS require an external codec and are not emitted. */
  readonly compression?: EXRCompression;
  /** Optional display-window width/height metadata; defaults to the data window. */
  readonly displayWindow?: { readonly width: number; readonly height: number };
  /** Generator string written to the EXR header. */
  readonly generator?: string;
}

/**
 * Writes RGBA CPU samples to an OpenEXR scanline image.
 *
 * The writer intentionally uses uncompressed 32-bit float channels in B, G, R,
 * A order. It does not read a WebGL/WebGPU render target, encode PMREM data, or
 * apply HDR color transforms; those operations remain application-owned.
 */
export class EXRExporter {
  /** Serializes a DataTexture or raw RGBA CPU source synchronously. */
  parse(
    source: DataTexture | EXRPixelSource,
    options: EXRExporterOptions = {},
  ): Uint8Array {
    const pixels = normalizeSource(source);
    const compression = options.compression ?? "none";
    if (compression !== "none") {
      throw new RangeError(
        `EXRExporter: unsupported compression "${compression}".`,
      );
    }
    const displayWindow = options.displayWindow ?? {
      width: pixels.width,
      height: pixels.height,
    };
    validateDimension(displayWindow.width, "displayWindow.width");
    validateDimension(displayWindow.height, "displayWindow.height");
    return writeEXRScanlines(
      pixels,
      displayWindow,
      options.generator ?? "EASEL.js EXRExporter",
    );
  }

  /** Promise-shaped export matching THREE.EXRExporter usage. */
  parseAsync(
    source: DataTexture | EXRPixelSource,
    options: EXRExporterOptions = {},
  ): Promise<Uint8Array> {
    return Promise.resolve(this.parse(source, options));
  }
}

interface NormalizedSource {
  readonly data: EXRPixelArray;
  readonly width: number;
  readonly height: number;
  readonly type: "uint8" | "half" | "float";
}

function normalizeSource(
  source: DataTexture | EXRPixelSource,
): NormalizedSource {
  if (source === undefined || source === null || typeof source !== "object") {
    throw new TypeError(
      "EXRExporter.parse: expected a DataTexture or RGBA pixel source.",
    );
  }
  const candidate = source as unknown as { readonly image?: unknown };
  const image = candidate.image;
  const value = isPixelSource(image) ? image : source;
  if (!isPixelSource(value)) {
    throw new TypeError(
      "EXRExporter.parse: source must provide RGBA data, width, and height.",
    );
  }
  validateDimension(value.width, "width");
  validateDimension(value.height, "height");
  const expected = value.width * value.height * 4;
  if (value.data.length !== expected) {
    throw new RangeError(
      `EXRExporter.parse: expected ${expected} RGBA samples, received ${value.data.length}.`,
    );
  }
  const type = value.type ?? inferType(value.data);
  if (type === "half" && !(value.data instanceof Uint16Array)) {
    throw new TypeError(
      "EXRExporter.parse: half samples require a Uint16Array.",
    );
  }
  if (type === "float" && !(value.data instanceof Float32Array)) {
    throw new TypeError(
      "EXRExporter.parse: float samples require a Float32Array.",
    );
  }
  if (
    type === "uint8" &&
    !(
      value.data instanceof Uint8Array ||
      value.data instanceof Uint8ClampedArray
    )
  ) {
    throw new TypeError(
      "EXRExporter.parse: uint8 samples require a Uint8Array or Uint8ClampedArray.",
    );
  }
  return { data: value.data, width: value.width, height: value.height, type };
}

function isPixelSource(value: unknown): value is EXRPixelSource {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<EXRPixelSource>;
  return (
    (candidate.data instanceof Uint8Array ||
      candidate.data instanceof Uint8ClampedArray ||
      candidate.data instanceof Uint16Array ||
      candidate.data instanceof Float32Array) &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number"
  );
}

function inferType(data: EXRPixelArray): "uint8" | "half" | "float" {
  if (data instanceof Float32Array) return "float";
  if (data instanceof Uint16Array) return "half";
  return "uint8";
}

function validateDimension(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 0x7fffffff) {
    throw new RangeError(
      `EXRExporter: ${label} must be a positive signed 32-bit integer.`,
    );
  }
}
