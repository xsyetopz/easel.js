import {
  type Pixel,
  type TGAHeaderData,
  decodeIndexedPixel,
  decodePixel,
  decodePixels,
  readHeader,
  validateHeader,
} from "./_TGALoaderHelpers.ts";
import { DataTextureLoader } from "./DataTextureLoader.ts";

const TGA_HEADER_BYTES = 18;
const TGA_TYPE_INDEXED = 1;
const TGA_TYPE_RLE_INDEXED = 9;
const TGA_TYPE_RLE_TRUE_COLOR = 10;
const TGA_TYPE_RLE_GRAYSCALE = 11;
const TGA_ORIGIN_MASK = 0x30;
const TGA_ORIGIN_SHIFT = 4;
const MAX_OUTPUT_BYTES = 256 * 1024 * 1024;

interface TGAPixelLayout {
  indexed: boolean;
  rle: boolean;
  bytesPerPixel: number;
}

function classifyImageType(imageType: number): TGAPixelLayout {
  const indexed =
    imageType === TGA_TYPE_INDEXED || imageType === TGA_TYPE_RLE_INDEXED;
  const rle =
    imageType === TGA_TYPE_RLE_INDEXED ||
    imageType === TGA_TYPE_RLE_TRUE_COLOR ||
    imageType === TGA_TYPE_RLE_GRAYSCALE;
  return { indexed, rle, bytesPerPixel: 0 };
}

interface TGAPaletteData {
  palette: Uint8Array | undefined;
  paletteBytesPerEntry: number;
  offset: number;
}

function readPalette(
  bytes: Uint8Array,
  offset: number,
  colorMapSize: number,
  colorMapLength: number,
): TGAPaletteData {
  const paletteBytesPerEntry = Math.ceil(colorMapSize / 8);
  const paletteByteLength = colorMapLength * paletteBytesPerEntry;
  if (offset + paletteByteLength > bytes.length) {
    throw new Error("TGALoader: Truncated color map.");
  }
  return {
    palette: bytes.subarray(offset, offset + paletteByteLength),
    paletteBytesPerEntry,
    offset: offset + paletteByteLength,
  };
}

interface TGADecodeContext {
  source: Uint8Array;
  bytesPerPixel: number;
  header: TGAHeaderData;
  palette: TGAPaletteData;
  indexed: boolean;
}

function decodePixelForMode(ctx: TGADecodeContext, sourceIndex: number): Pixel {
  if (!ctx.indexed) {
    return decodePixel(ctx.source, sourceIndex, ctx.header);
  }
  return decodeIndexedPixel({
    source: ctx.source,
    sourceOffset: sourceIndex,
    bytesPerPixel: ctx.bytesPerPixel,
    palette: ctx.palette.palette ?? new Uint8Array(),
    paletteBytesPerEntry: ctx.palette.paletteBytesPerEntry,
    colorMapSize: ctx.header.colorMapSize,
    colorMapIndex: ctx.header.colorMapIndex,
    colorMapLength: ctx.header.colorMapLength,
  });
}

/**
 * Loads TGA images into CPU RGBA pixels for Canvas2D texture sampling.
 *
 * The decoder follows THREE's TGALoader for image types 1, 2, 3, 9, 10,
 * and 11. It supports uncompressed and packet-RLE indexed, true-color, and
 * grayscale images, including the four TGA origin modes. No GPU resource or
 * mipmap is created; the inherited DataTextureLoader wraps the returned pixels
 * in an EASEL {@link DataTexture}.
 */
export class TGALoader extends DataTextureLoader {
  /** Parses a TGA ArrayBuffer into tightly packed top-left RGBA pixels. */
  override parse(buffer: ArrayBuffer): {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } {
    if (!(buffer instanceof ArrayBuffer)) {
      throw new TypeError("TGALoader: Expected an ArrayBuffer.");
    }
    if (buffer.byteLength < TGA_HEADER_BYTES) {
      throw new Error("TGALoader: Not enough data to contain header.");
    }

    const bytes = new Uint8Array(buffer);
    const header = readHeader(bytes);
    validateHeader(header);

    const pixelCount = header.width * header.height;
    if (pixelCount > MAX_OUTPUT_BYTES / 4) {
      throw new Error("TGALoader: Image is too large for CPU decoding.");
    }

    let offset = TGA_HEADER_BYTES;
    if (offset + header.idLength > bytes.length) {
      throw new Error("TGALoader: No data after image identifier.");
    }
    offset += header.idLength;

    const layout = classifyImageType(header.imageType);
    layout.bytesPerPixel = header.pixelDepth >> 3;

    let palette: TGAPaletteData = {
      palette: undefined,
      paletteBytesPerEntry: 0,
      offset,
    };
    if (layout.indexed) {
      palette = readPalette(
        bytes,
        offset,
        header.colorMapSize,
        header.colorMapLength,
      );
      offset = palette.offset;
    }

    const source = decodePixels({
      bytes,
      offset,
      pixelCount,
      bytesPerPixel: layout.bytesPerPixel,
      rle: layout.rle,
    });
    const image = new Uint8ClampedArray(pixelCount * 4);
    const origin = (header.flags & TGA_ORIGIN_MASK) >> TGA_ORIGIN_SHIFT;
    const rightToLeft = origin === 1 || origin === 3;
    const bottomToTop = origin === 0 || origin === 1;

    const decodeCtx: TGADecodeContext = {
      source,
      bytesPerPixel: layout.bytesPerPixel,
      header,
      palette,
      indexed: layout.indexed,
    };

    for (let sourceIndex = 0; sourceIndex < pixelCount; sourceIndex++) {
      const sourceX = sourceIndex % header.width;
      const sourceY = Math.floor(sourceIndex / header.width);
      const x = rightToLeft ? header.width - sourceX - 1 : sourceX;
      const y = bottomToTop ? header.height - sourceY - 1 : sourceY;
      const targetOffset = (y * header.width + x) * 4;
      const pixel = decodePixelForMode(
        decodeCtx,
        sourceIndex * layout.bytesPerPixel,
      );
      image[targetOffset] = pixel.red;
      image[targetOffset + 1] = pixel.green;
      image[targetOffset + 2] = pixel.blue;
      image[targetOffset + 3] = pixel.alpha;
    }

    return { data: image, width: header.width, height: header.height };
  }
}
