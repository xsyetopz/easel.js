import { DataTextureLoader } from "./DataTextureLoader.ts";

const TGA_HEADER_BYTES = 18;
const TGA_TYPE_NO_DATA = 0;
const TGA_TYPE_INDEXED = 1;
const TGA_TYPE_TRUE_COLOR = 2;
const TGA_TYPE_GRAYSCALE = 3;
const TGA_TYPE_RLE_INDEXED = 9;
const TGA_TYPE_RLE_TRUE_COLOR = 10;
const TGA_TYPE_RLE_GRAYSCALE = 11;
const TGA_ORIGIN_MASK = 0x30;
const TGA_ORIGIN_SHIFT = 4;
const MAX_OUTPUT_BYTES = 256 * 1024 * 1024;

interface TGAHeader {
  idLength: number;
  colorMapType: number;
  imageType: number;
  colorMapIndex: number;
  colorMapLength: number;
  colorMapSize: number;
  width: number;
  height: number;
  pixelDepth: number;
  flags: number;
}

interface Pixel {
  red: number;
  green: number;
  blue: number;
  alpha: number;
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

    const indexed =
      header.imageType === TGA_TYPE_INDEXED ||
      header.imageType === TGA_TYPE_RLE_INDEXED;
    const rle =
      header.imageType === TGA_TYPE_RLE_INDEXED ||
      header.imageType === TGA_TYPE_RLE_TRUE_COLOR ||
      header.imageType === TGA_TYPE_RLE_GRAYSCALE;
    const bytesPerPixel = header.pixelDepth >> 3;

    let palette: Uint8Array | undefined;
    let paletteBytesPerEntry = 0;
    if (indexed) {
      paletteBytesPerEntry = Math.ceil(header.colorMapSize / 8);
      const paletteByteLength = header.colorMapLength * paletteBytesPerEntry;
      if (offset + paletteByteLength > bytes.length) {
        throw new Error("TGALoader: Truncated color map.");
      }
      palette = bytes.subarray(offset, offset + paletteByteLength);
      offset += paletteByteLength;
    }

    const source = decodePixels(bytes, offset, pixelCount, bytesPerPixel, rle);
    const image = new Uint8ClampedArray(pixelCount * 4);
    const origin = (header.flags & TGA_ORIGIN_MASK) >> TGA_ORIGIN_SHIFT;
    const rightToLeft = origin === 1 || origin === 3;
    const bottomToTop = origin === 0 || origin === 1;

    for (let sourceIndex = 0; sourceIndex < pixelCount; sourceIndex++) {
      const sourceX = sourceIndex % header.width;
      const sourceY = Math.floor(sourceIndex / header.width);
      const x = rightToLeft ? header.width - sourceX - 1 : sourceX;
      const y = bottomToTop ? header.height - sourceY - 1 : sourceY;
      const targetOffset = (y * header.width + x) * 4;
      const pixel = indexed
        ? decodeIndexedPixel(
            source,
            sourceIndex * bytesPerPixel,
            bytesPerPixel,
            palette!,
            paletteBytesPerEntry,
            header.colorMapSize,
            header.colorMapIndex,
            header.colorMapLength,
          )
        : decodePixel(source, sourceIndex * bytesPerPixel, header);
      image[targetOffset] = pixel.red;
      image[targetOffset + 1] = pixel.green;
      image[targetOffset + 2] = pixel.blue;
      image[targetOffset + 3] = pixel.alpha;
    }

    return { data: image, width: header.width, height: header.height };
  }
}

function readHeader(bytes: Uint8Array): TGAHeader {
  return {
    idLength: bytes[0]!,
    colorMapType: bytes[1]!,
    imageType: bytes[2]!,
    colorMapIndex: bytes[3]! | (bytes[4]! << 8),
    colorMapLength: bytes[5]! | (bytes[6]! << 8),
    colorMapSize: bytes[7]!,
    width: bytes[12]! | (bytes[13]! << 8),
    height: bytes[14]! | (bytes[15]! << 8),
    pixelDepth: bytes[16]!,
    flags: bytes[17]!,
  };
}

function validateHeader(header: TGAHeader): void {
  if (header.width <= 0 || header.height <= 0) {
    throw new Error("TGALoader: Invalid image size.");
  }

  if (header.colorMapType !== 0 && header.colorMapType !== 1) {
    throw new Error("TGALoader: Invalid color map type.");
  }

  const indexed =
    header.imageType === TGA_TYPE_INDEXED ||
    header.imageType === TGA_TYPE_RLE_INDEXED;
  const trueColor =
    header.imageType === TGA_TYPE_TRUE_COLOR ||
    header.imageType === TGA_TYPE_RLE_TRUE_COLOR;
  const grayscale =
    header.imageType === TGA_TYPE_GRAYSCALE ||
    header.imageType === TGA_TYPE_RLE_GRAYSCALE;

  if (
    header.imageType === TGA_TYPE_NO_DATA ||
    (!((indexed || trueColor ) || grayscale))
  ) {
    throw new Error(`TGALoader: Invalid image type ${header.imageType}.`);
  }

  if (indexed) {
    if (header.colorMapType !== 1) {
      throw new Error("TGALoader: Indexed images require a color map.");
    }
    if (header.colorMapLength <= 0 || header.colorMapLength > 256) {
      throw new Error("TGALoader: Invalid color map length.");
    }
    if (![15, 16, 24, 32].includes(header.colorMapSize)) {
      throw new Error(
        `TGALoader: Unsupported color map entry size ${header.colorMapSize}.`,
      );
    }
    if (header.pixelDepth !== 8 && header.pixelDepth !== 16) {
      throw new Error(
        `TGALoader: Unsupported indexed pixel size ${header.pixelDepth}.`,
      );
    }
    return;
  }

  if (header.colorMapType !== 0) {
    throw new Error("TGALoader: Non-indexed images cannot have a color map.");
  }

  if (trueColor && ![16, 24, 32].includes(header.pixelDepth)) {
    throw new Error(
      `TGALoader: Unsupported true-color pixel size ${header.pixelDepth}.`,
    );
  }
  if (grayscale && header.pixelDepth !== 8 && header.pixelDepth !== 16) {
    throw new Error(
      `TGALoader: Unsupported grayscale pixel size ${header.pixelDepth}.`,
    );
  }
}

function decodePixels(
  bytes: Uint8Array,
  offset: number,
  pixelCount: number,
  bytesPerPixel: number,
  rle: boolean,
): Uint8Array {
  const byteLength = pixelCount * bytesPerPixel;
  if (offset + byteLength > bytes.length && !rle) {
    throw new Error("TGALoader: Truncated pixel data.");
  }
  if (!rle) return bytes.subarray(offset, offset + byteLength);

  const pixels = new Uint8Array(byteLength);
  let sourceOffset = offset;
  let targetOffset = 0;
  while (targetOffset < byteLength) {
    if (sourceOffset >= bytes.length) {
      throw new Error("TGALoader: Truncated RLE packet header.");
    }
    const packet = bytes[sourceOffset]!;
    sourceOffset++;
    const count = (packet & 0x7f) + 1;
    const packetBytes = count * bytesPerPixel;
    if (targetOffset + packetBytes > byteLength) {
      throw new Error("TGALoader: RLE packet exceeds image dimensions.");
    }

    if (packet & 0x80) {
      if (sourceOffset + bytesPerPixel > bytes.length) {
        throw new Error("TGALoader: Truncated RLE pixel.");
      }
      const pixel = bytes.subarray(sourceOffset, sourceOffset + bytesPerPixel);
      for (let repeat = 0; repeat < count; repeat++) {
        pixels.set(pixel, targetOffset + repeat * bytesPerPixel);
      }
      sourceOffset += bytesPerPixel;
    } else {
      if (sourceOffset + packetBytes > bytes.length) {
        throw new Error("TGALoader: Truncated raw RLE packet.");
      }
      pixels.set(
        bytes.subarray(sourceOffset, sourceOffset + packetBytes),
        targetOffset,
      );
      sourceOffset += packetBytes;
    }
    targetOffset += packetBytes;
  }
  return pixels;
}

function decodeIndexedPixel(
  source: Uint8Array,
  sourceOffset: number,
  bytesPerPixel: number,
  palette: Uint8Array,
  paletteBytesPerEntry: number,
  colorMapSize: number,
  colorMapIndex: number,
  colorMapLength: number,
): Pixel {
  const index =
    bytesPerPixel === 1
      ? source[sourceOffset]!
      : source[sourceOffset]! | (source[sourceOffset + 1]! << 8);
  const paletteIndex = index - colorMapIndex;
  if (paletteIndex < 0 || paletteIndex >= colorMapLength) {
    throw new Error(`TGALoader: Color map index ${index} is out of range.`);
  }
  return decodeColorMapEntry(
    palette,
    paletteIndex * paletteBytesPerEntry,
    paletteBytesPerEntry,
    colorMapSize,
  );
}

function decodeColorMapEntry(
  palette: Uint8Array,
  offset: number,
  bytesPerEntry: number,
  colorMapSize: number,
): Pixel {
  if (bytesPerEntry === 2) {
    return decodePackedColor(palette, offset, colorMapSize === 16);
  }
  if (bytesPerEntry === 3) {
    return {
      red: palette[offset + 2]!,
      green: palette[offset + 1]!,
      blue: palette[offset]!,
      alpha: 255,
    };
  }
  return {
    red: palette[offset + 2]!,
    green: palette[offset + 1]!,
    blue: palette[offset]!,
    alpha: palette[offset + 3]!,
  };
}

function decodePixel(
  source: Uint8Array,
  offset: number,
  header: TGAHeader,
): Pixel {
  if (
    header.imageType === TGA_TYPE_GRAYSCALE ||
    header.imageType === TGA_TYPE_RLE_GRAYSCALE
  ) {
    const gray = source[offset]!;
    return {
      red: gray,
      green: gray,
      blue: gray,
      alpha: header.pixelDepth === 16 ? source[offset + 1]! : 255,
    };
  }

  if (header.pixelDepth === 16) {
    return decodePackedColor(source, offset, true);
  }
  if (header.pixelDepth === 24) {
    return {
      red: source[offset + 2]!,
      green: source[offset + 1]!,
      blue: source[offset]!,
      alpha: 255,
    };
  }
  return {
    red: source[offset + 2]!,
    green: source[offset + 1]!,
    blue: source[offset]!,
    alpha: source[offset + 3]!,
  };
}

function decodePackedColor(
  source: Uint8Array,
  offset: number,
  withAlpha: boolean,
): Pixel {
  const color = source[offset]! | (source[offset + 1]! << 8);
  return {
    red: (color & 0x7c00) >> 7,
    green: (color & 0x03e0) >> 2,
    blue: (color & 0x001f) << 3,
    alpha: withAlpha && color & 0x8000 ? 0 : 255,
  };
}
