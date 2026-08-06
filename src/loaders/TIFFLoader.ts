import { DataTextureLoader } from "./DataTextureLoader.ts";

const TIFF_HEADER_BYTES = 8;
const TIFF_MAGIC = 42;
const MAX_OUTPUT_BYTES = 256 * 1024 * 1024;

/** Photometric interpretation used by a decoded TIFF image. */
export type TIFFPhotometric = "black-is-zero" | "white-is-zero" | "rgb";

/** CPU RGBA representation returned by {@link TIFFLoader.parse}. */
export interface TIFFParseResult {
  /** Top-left ordered RGBA pixels for Canvas2D sampling. */
  readonly data: Uint8ClampedArray;
  /** Decoded output width after applying TIFF orientation. */
  readonly width: number;
  /** Decoded output height after applying TIFF orientation. */
  readonly height: number;
  /** Byte order declared by the TIFF header. */
  readonly endianness: "little" | "big";
  /** Decoded photometric interpretation. */
  readonly photometric: TIFFPhotometric;
  /** Compression scheme; this bounded decoder accepts baseline 1 only. */
  readonly compression: 1;
  /** Number of samples stored for each source pixel. */
  readonly samplesPerPixel: number;
  /** Bits per source sample, one entry per channel. */
  readonly bitsPerSample: readonly number[];
  /** TIFF orientation tag applied to the output pixels. */
  readonly orientation: number;
  /** Source rows stored in each strip, clamped to image height. */
  readonly rowsPerStrip: number;
  /** Number of strips consumed from the source image. */
  readonly stripCount: number;
  /** Planar configuration; this decoder accepts chunky samples (1) only. */
  readonly planarConfiguration: 1;
  /** ExtraSamples values retained when present. */
  readonly extraSamples: readonly number[];
}

interface IFDEntry {
  readonly tag: number;
  readonly type: number;
  readonly count: number;
  readonly valueOffset: number;
}

/**
 * Decodes baseline, uncompressed TIFF images into CPU RGBA pixels.
 *
 * The loader deliberately stays inside EASEL's Canvas2D texture boundary:
 * little- and big-endian files, chunky RGB/RGBA/grayscale samples, packed
 * grayscale bit depths, and strips are decoded without a GPU or compression
 * dependency. Compression, planar sample storage, palettes, and tiled images
 * are rejected explicitly rather than being interpreted as raw pixels.
 */
export class TIFFLoader extends DataTextureLoader {
  /** Parses the first TIFF image directory in an ArrayBuffer. */
  override parse(buffer: ArrayBuffer): TIFFParseResult {
    if (!(buffer instanceof ArrayBuffer)) {
      throw new TypeError("TIFFLoader: Expected an ArrayBuffer.");
    }
    if (buffer.byteLength < TIFF_HEADER_BYTES) {
      throw new Error("TIFFLoader: Not enough data to contain the header.");
    }

    const view = new DataView(buffer);
    const byteOrder = readByteOrder(view);
    const littleEndian = byteOrder === "little";
    if (view.getUint16(2, littleEndian) !== TIFF_MAGIC) {
      throw new Error("TIFFLoader: Invalid TIFF magic number.");
    }
    const firstIFDOffset = view.getUint32(4, littleEndian);
    if (firstIFDOffset === 0) {
      throw new Error("TIFFLoader: TIFF does not contain an image directory.");
    }
    const entries = readIFD(view, firstIFDOffset, littleEndian);

    const sourceWidth = readDimension(
      entries,
      view,
      256,
      littleEndian,
      "width",
    );
    const sourceHeight = readDimension(
      entries,
      view,
      257,
      littleEndian,
      "height",
    );
    if (
      !Number.isSafeInteger(sourceWidth * sourceHeight) ||
      sourceWidth * sourceHeight * 4 > MAX_OUTPUT_BYTES
    ) {
      throw new Error("TIFFLoader: Image is too large for CPU decoding.");
    }

    const compression = readScalarTag(
      entries,
      view,
      259,
      littleEndian,
      1,
      "compression",
    );
    if (compression !== 1) {
      throw new Error(
        "TIFFLoader: Unsupported compression; only uncompressed baseline TIFF data is supported.",
      );
    }

    const photometricValue = readScalarTag(
      entries,
      view,
      262,
      littleEndian,
      1,
      "photometric interpretation",
    );
    const photometric = decodePhotometric(photometricValue);
    const samplesPerPixel = readScalarTag(
      entries,
      view,
      277,
      littleEndian,
      1,
      "samples per pixel",
    );
    if (samplesPerPixel < 1 || samplesPerPixel > 4) {
      throw new Error(
        `TIFFLoader: Unsupported samples-per-pixel value ${samplesPerPixel}; expected 1 through 4.`,
      );
    }
    validateSamplesPerPixel(photometric, samplesPerPixel);

    const bitsValues = readTagValues(
      entries,
      view,
      258,
      littleEndian,
      "bits per sample",
    );
    const bitsPerSample = normalizeBitsPerSample(
      bitsValues.length > 0 ? bitsValues : [8],
      samplesPerPixel,
      photometric,
    );

    const planarConfiguration = readScalarTag(
      entries,
      view,
      284,
      littleEndian,
      1,
      "planar configuration",
    );
    if (planarConfiguration !== 1) {
      throw new Error(
        "TIFFLoader: Planar TIFF samples are unsupported; expected chunky planar configuration 1.",
      );
    }

    const orientation = readScalarTag(
      entries,
      view,
      274,
      littleEndian,
      1,
      "orientation",
    );
    if (!Number.isInteger(orientation) || orientation < 1 || orientation > 8) {
      throw new Error(
        `TIFFLoader: Unsupported orientation ${orientation}; expected a value from 1 through 8.`,
      );
    }

    const rowsPerStripValue = readScalarTag(
      entries,
      view,
      278,
      littleEndian,
      sourceHeight,
      "rows per strip",
    );
    if (rowsPerStripValue <= 0) {
      throw new Error("TIFFLoader: Rows per strip must be positive.");
    }
    const rowsPerStrip = Math.min(sourceHeight, rowsPerStripValue);
    const stripOffsets = readTagValues(
      entries,
      view,
      273,
      littleEndian,
      "strip offsets",
    );
    const stripByteCounts = readTagValues(
      entries,
      view,
      279,
      littleEndian,
      "strip byte counts",
    );
    if (
      stripOffsets.length === 0 ||
      stripOffsets.length !== stripByteCounts.length
    ) {
      throw new Error(
        "TIFFLoader: Strip offsets and byte counts must contain the same non-zero number of entries.",
      );
    }

    const rowBits = bitsPerSample.reduce((total, bits) => total + bits, 0);
    const rowByteLength = Math.ceil((sourceWidth * rowBits) / 8);
    const expectedStripCount = Math.ceil(sourceHeight / rowsPerStrip);
    if (stripOffsets.length < expectedStripCount) {
      throw new Error("TIFFLoader: TIFF strip data is incomplete.");
    }
    for (let strip = 0; strip < expectedStripCount; strip++) {
      const stripRows = Math.min(
        rowsPerStrip,
        sourceHeight - strip * rowsPerStrip,
      );
      const minimumBytes = rowByteLength * stripRows;
      const offset = stripOffsets[strip];
      const byteCount = stripByteCounts[strip];
      if (
        offset === undefined ||
        byteCount === undefined ||
        byteCount < minimumBytes
      ) {
        throw new Error(
          `TIFFLoader: Strip ${strip} is shorter than its source rows.`,
        );
      }
      ensureRange(view, offset, byteCount, `strip ${strip}`);
    }

    const extraSamples = readOptionalTagValues(
      entries,
      view,
      338,
      littleEndian,
      "extra samples",
    );
    const outputIsTransposed = orientation >= 5;
    const outputWidth = outputIsTransposed ? sourceHeight : sourceWidth;
    const outputHeight = outputIsTransposed ? sourceWidth : sourceHeight;
    const output = new Uint8ClampedArray(outputWidth * outputHeight * 4);

    for (let sourceY = 0; sourceY < sourceHeight; sourceY++) {
      const strip = Math.floor(sourceY / rowsPerStrip);
      const rowInStrip = sourceY - strip * rowsPerStrip;
      const stripOffset = stripOffsets[strip] ?? 0;
      const rowOffset = stripOffset + rowInStrip * rowByteLength;
      for (let sourceX = 0; sourceX < sourceWidth; sourceX++) {
        const channels = new Array<number>(samplesPerPixel);
        let bitOffset = sourceX * rowBits;
        for (let channel = 0; channel < samplesPerPixel; channel++) {
          const bits = bitsPerSample[channel] ?? bitsPerSample[0] ?? 8;
          const value = readSample(
            view,
            rowOffset,
            bitOffset,
            bits,
            littleEndian,
          );
          channels[channel] = normalizeSample(value, bits);
          bitOffset += bits;
        }
        const alpha =
          samplesPerPixel === 2 || samplesPerPixel === 4
            ? (channels[samplesPerPixel - 1] ?? 255)
            : 255;
        if (photometric !== "rgb") {
          const sourceGray = channels[0] ?? 0;
          const gray =
            photometric === "white-is-zero" ? 255 - sourceGray : sourceGray;
          channels[0] = gray;
          channels[1] = gray;
          channels[2] = gray;
        }
        const [outputX, outputY] = mapOrientation(
          orientation,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
        );
        const target = (outputY * outputWidth + outputX) * 4;
        output[target] = channels[0] ?? 0;
        output[target + 1] = channels[1] ?? channels[0] ?? 0;
        output[target + 2] = channels[2] ?? channels[0] ?? 0;
        output[target + 3] = alpha;
      }
    }

    return {
      data: output,
      width: outputWidth,
      height: outputHeight,
      endianness: byteOrder,
      photometric,
      compression: 1,
      samplesPerPixel,
      bitsPerSample: Object.freeze([...bitsPerSample]),
      orientation,
      rowsPerStrip,
      stripCount: expectedStripCount,
      planarConfiguration: 1,
      extraSamples: Object.freeze([...extraSamples]),
    };
  }
}

function readByteOrder(view: DataView): "little" | "big" {
  const first = view.getUint8(0);
  const second = view.getUint8(1);
  if (first === 0x49 && second === 0x49) return "little";
  if (first === 0x4d && second === 0x4d) return "big";
  throw new Error("TIFFLoader: Invalid byte-order marker; expected II or MM.");
}

function readIFD(
  view: DataView,
  offset: number,
  littleEndian: boolean,
): Map<number, IFDEntry> {
  ensureRange(view, offset, 2, "image directory count");
  const count = view.getUint16(offset, littleEndian);
  const entriesEnd = offset + 2 + count * 12 + 4;
  if (!Number.isSafeInteger(entriesEnd)) {
    throw new Error("TIFFLoader: Image directory is too large.");
  }
  ensureRange(view, offset, 2 + count * 12 + 4, "image directory");
  const entries = new Map<number, IFDEntry>();
  let entryOffset = offset + 2;
  for (let index = 0; index < count; index++) {
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const valueCount = view.getUint32(entryOffset + 4, littleEndian);
    if (valueCount === 0) {
      throw new Error(`TIFFLoader: TIFF tag ${tag} has no values.`);
    }
    entries.set(tag, {
      tag,
      type,
      count: valueCount,
      valueOffset: entryOffset + 8,
    });
    entryOffset += 12;
  }
  return entries;
}

function readDimension(
  entries: Map<number, IFDEntry>,
  view: DataView,
  tag: number,
  littleEndian: boolean,
  name: string,
): number {
  const value = readScalarTag(entries, view, tag, littleEndian, 0, name);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`TIFFLoader: Invalid image ${name}.`);
  }
  return value;
}

function readScalarTag(
  entries: Map<number, IFDEntry>,
  view: DataView,
  tag: number,
  littleEndian: boolean,
  defaultValue: number,
  name: string,
): number {
  const values = readOptionalTagValues(entries, view, tag, littleEndian, name);
  if (values.length === 0) return defaultValue;
  if (values.length !== 1) {
    throw new Error(`TIFFLoader: TIFF ${name} must contain one value.`);
  }
  return values[0] ?? defaultValue;
}

function readTagValues(
  entries: Map<number, IFDEntry>,
  view: DataView,
  tag: number,
  littleEndian: boolean,
  name: string,
): number[] {
  const values = readOptionalTagValues(entries, view, tag, littleEndian, name);
  if (values.length === 0) {
    throw new Error(`TIFFLoader: Missing TIFF ${name} tag.`);
  }
  return values;
}

function readOptionalTagValues(
  entries: Map<number, IFDEntry>,
  view: DataView,
  tag: number,
  littleEndian: boolean,
  name: string,
): number[] {
  const entry = entries.get(tag);
  if (entry === undefined) return [];
  const typeBytes = typeSize(entry.type);
  if (typeBytes === undefined) {
    throw new Error(`TIFFLoader: Unsupported TIFF type for ${name}.`);
  }
  const byteLength = entry.count * typeBytes;
  if (!Number.isSafeInteger(byteLength)) {
    throw new Error(`TIFFLoader: TIFF ${name} value is too large.`);
  }
  const offset =
    byteLength <= 4
      ? entry.valueOffset
      : readOffset(view, entry.valueOffset, littleEndian);
  ensureRange(view, offset, byteLength, name);
  const values: number[] = [];
  for (let index = 0; index < entry.count; index++) {
    const valueOffset = offset + index * typeBytes;
    switch (entry.type) {
      case 1:
        values.push(view.getUint8(valueOffset));
        break;
      case 3:
        values.push(view.getUint16(valueOffset, littleEndian));
        break;
      case 4:
        values.push(view.getUint32(valueOffset, littleEndian));
        break;
      default:
        throw new Error(`TIFFLoader: Unsupported TIFF type for ${name}.`);
    }
  }
  return values;
}

function readOffset(
  view: DataView,
  offset: number,
  littleEndian: boolean,
): number {
  return view.getUint32(offset, littleEndian);
}

function typeSize(type: number): 1 | 2 | 4 | 0 {
  if (type === 1) return 1;
  if (type === 3) return 2;
  if (type === 4) return 4;
  return 0;
}

function decodePhotometric(value: number): TIFFPhotometric {
  if (value === 0) return "white-is-zero";
  if (value === 1) return "black-is-zero";
  if (value === 2) return "rgb";
  throw new Error(
    `TIFFLoader: Unsupported photometric interpretation ${value}; expected grayscale or RGB.`,
  );
}

function validateSamplesPerPixel(
  photometric: TIFFPhotometric,
  samplesPerPixel: number,
): void {
  if (photometric === "rgb" && samplesPerPixel !== 3 && samplesPerPixel !== 4) {
    throw new Error(
      "TIFFLoader: RGB TIFF images must contain 3 or 4 samples per pixel.",
    );
  }
  if (photometric !== "rgb" && samplesPerPixel !== 1 && samplesPerPixel !== 2) {
    throw new Error(
      "TIFFLoader: Grayscale TIFF images must contain one sample or one alpha sample.",
    );
  }
}

function normalizeBitsPerSample(
  values: readonly number[],
  samplesPerPixel: number,
  photometric: TIFFPhotometric,
): number[] {
  const bits =
    values.length === 1 && samplesPerPixel > 1
      ? new Array<number>(samplesPerPixel).fill(values[0] ?? 8)
      : [...values];
  if (bits.length !== samplesPerPixel) {
    throw new Error(
      "TIFFLoader: BitsPerSample count must match samples per pixel.",
    );
  }
  for (const value of bits) {
    if (![1, 2, 4, 8, 16].includes(value)) {
      throw new Error(
        `TIFFLoader: Unsupported BitsPerSample value ${value}; expected 1, 2, 4, 8, or 16.`,
      );
    }
    if (photometric === "rgb" && value !== 8 && value !== 16) {
      throw new Error(
        "TIFFLoader: RGB TIFF samples must use 8 or 16 bits per channel.",
      );
    }
  }
  return bits;
}

function readSample(
  view: DataView,
  rowOffset: number,
  bitOffset: number,
  bits: number,
  littleEndian: boolean,
): number {
  if (bits < 8) {
    const byteOffset = rowOffset + (bitOffset >> 3);
    const shift = 8 - bits - (bitOffset & 7);
    return (view.getUint8(byteOffset) >> shift) & ((1 << bits) - 1);
  }
  const byteOffset = rowOffset + (bitOffset >> 3);
  if (bits === 8) return view.getUint8(byteOffset);
  return view.getUint16(byteOffset, littleEndian);
}

function normalizeSample(value: number, bits: number): number {
  const maximum = (1 << Math.min(bits, 30)) - 1;
  return Math.round((value * 255) / maximum);
}

function mapOrientation(
  orientation: number,
  x: number,
  y: number,
  width: number,
  height: number,
): [number, number] {
  switch (orientation) {
    case 2:
      return [width - 1 - x, y];
    case 3:
      return [width - 1 - x, height - 1 - y];
    case 4:
      return [x, height - 1 - y];
    case 5:
      return [y, x];
    case 6:
      return [height - 1 - y, x];
    case 7:
      return [height - 1 - y, width - 1 - x];
    case 8:
      return [y, width - 1 - x];
    default:
      return [x, y];
  }
}

function ensureRange(
  view: DataView,
  offset: number,
  length: number,
  name: string,
): void {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset > view.byteLength ||
    length > view.byteLength - offset
  ) {
    throw new Error(`TIFFLoader: Truncated ${name}.`);
  }
}
