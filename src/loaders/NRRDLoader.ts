import { DataTexture } from "../textures/DataTexture.ts";
import {
  axisToIndex,
  clamp01,
  clampByte,
  computeRange,
  createDataArray,
  decodePayload,
  defaultSliceAxis,
  deriveAxisOrder,
  deriveSpacing,
  findHeaderEnd,
  normalizeColor,
  parseHeader,
  product,
  toBytes,
} from "./_NRRDLoaderInternals.ts";
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
        const [x, y, z] = this.#sliceCoordinate(axisIndex, column, row, index);
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
    if (axisIndex === 0) {
      return this.xLength;
    }
    if (axisIndex === 1) {
      return this.yLength;
    }
    return this.zLength;
  }

  #sliceCoordinate(
    axisIndex: 0 | 1 | 2,
    column: number,
    row: number,
    index: number,
  ): [number, number, number] {
    if (axisIndex === 0) {
      return [index, column, row];
    }
    if (axisIndex === 1) {
      return [column, index, row];
    }
    return [column, row, index];
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
  override parse(input: NRRDInput): NRRDVolume {
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
