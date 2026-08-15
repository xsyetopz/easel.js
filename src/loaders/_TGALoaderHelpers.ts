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

/** One decoded TGA pixel in RGBA channel order. */
export interface Pixel {
  /** Red channel. */
  red: number;
  /** Green channel. */
  green: number;
  /** Blue channel. */
  blue: number;
  /** Alpha channel. */
  alpha: number;
}

/** Mutable state while decoding a TGA image. */
export interface TGAReadContext {
  /** Source bytes. */
  bytes: Uint8Array;
  /** Current source offset. */
  offset: number;
  /** Number of pixels decoded so far. */
  pixelCount: number;
  /** Bytes per source pixel. */
  bytesPerPixel: number;
  /** Whether run-length encoding is active. */
  rle: boolean;
}

/** Palette metadata used by indexed TGA decoding. */
export interface TGAPaletteContext {
  /** Palette bytes, when present. */
  palette: Uint8Array | undefined;
  /** Bytes per palette entry. */
  paletteBytesPerEntry: number;
  /** Palette entry bit depth. */
  colorMapSize: number;
  /** First palette index. */
  colorMapIndex: number;
  /** Number of palette entries. */
  colorMapLength: number;
}

const TGA_TYPE_INDEXED = 1;
const TGA_TYPE_RLE_INDEXED = 9;
const TGA_TYPE_RLE_GRAYSCALE = 11;
const TGA_TYPE_GRAYSCALE = 3;

/** Public shape of the fields decoded from a TGA file header. */
export interface TGAHeaderData extends TGAHeader {}

/** Reads little-endian dimensions, palette metadata, and pixel flags. */
export function readHeader(bytes: Uint8Array): TGAHeader {
  return {
    idLength: bytes[0] ?? 0,
    colorMapType: bytes[1] ?? 0,
    imageType: bytes[2] ?? 0,
    colorMapIndex: (bytes[3] ?? 0) | ((bytes[4] ?? 0) << 8),
    colorMapLength: (bytes[5] ?? 0) | ((bytes[6] ?? 0) << 8),
    colorMapSize: bytes[7] ?? 0,
    width: (bytes[12] ?? 0) | ((bytes[13] ?? 0) << 8),
    height: (bytes[14] ?? 0) | ((bytes[15] ?? 0) << 8),
    pixelDepth: bytes[16] ?? 0,
    flags: bytes[17] ?? 0,
  };
}

/** Validates dimensions, color-map metadata, image type, and pixel depth. */
export function validateHeader(header: TGAHeader): void {
  validateImageDimensions(header);
  validateColorMapType(header);
  validateImageType(header);
}

function validateImageDimensions(header: TGAHeader): void {
  if (header.width <= 0 || header.height <= 0) {
    throw new Error("TGALoader: Invalid image size.");
  }
}

function validateColorMapType(header: TGAHeader): void {
  if (header.colorMapType !== 0 && header.colorMapType !== 1) {
    throw new Error("TGALoader: Invalid color map type.");
  }
}

function validateImageType(header: TGAHeader): void {
  const indexed =
    header.imageType === TGA_TYPE_INDEXED ||
    header.imageType === TGA_TYPE_RLE_INDEXED;
  const trueColor = isTrueColor(header.imageType);
  const grayscale =
    header.imageType === TGA_TYPE_GRAYSCALE ||
    header.imageType === TGA_TYPE_RLE_GRAYSCALE;
  if (header.imageType === 0 || !(indexed || trueColor || grayscale)) {
    throw new Error(`TGALoader: Invalid image type ${header.imageType}.`);
  }
  if (indexed) {
    validateIndexedHeader(header);
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

function isTrueColor(imageType: number): boolean {
  return imageType === 2 || imageType === 10;
}

function validateIndexedHeader(header: TGAHeader): void {
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
}

/** Extracts raw or run-length encoded pixel bytes from a TGA stream. */
export function decodePixels(ctx: TGAReadContext): Uint8Array {
  const { bytes, offset, pixelCount, bytesPerPixel, rle } = ctx;
  const byteLength = pixelCount * bytesPerPixel;
  if (offset + byteLength > bytes.length && !rle) {
    throw new Error("TGALoader: Truncated pixel data.");
  }
  if (!rle) return bytes.subarray(offset, offset + byteLength);
  return decodeRlePixels(bytes, offset, byteLength, bytesPerPixel);
}

function decodeRlePixels(
  bytes: Uint8Array,
  offset: number,
  byteLength: number,
  bytesPerPixel: number,
): Uint8Array {
  const pixels = new Uint8Array(byteLength);
  let sourceOffset = offset;
  let targetOffset = 0;
  while (targetOffset < byteLength) {
    if (sourceOffset >= bytes.length) {
      throw new Error("TGALoader: Truncated RLE packet header.");
    }
    const packet = bytes[sourceOffset] ?? 0;
    sourceOffset++;
    const count = (packet & 0x7f) + 1;
    const packetBytes = count * bytesPerPixel;
    if (targetOffset + packetBytes > byteLength) {
      throw new Error("TGALoader: RLE packet exceeds image dimensions.");
    }
    if (packet & 0x80) {
      sourceOffset = decodeRleRun(
        bytes,
        sourceOffset,
        targetOffset,
        count,
        bytesPerPixel,
        pixels,
      );
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

function decodeRleRun(
  bytes: Uint8Array,
  sourceOffset: number,
  targetOffset: number,
  count: number,
  bytesPerPixel: number,
  pixels: Uint8Array,
): number {
  if (sourceOffset + bytesPerPixel > bytes.length) {
    throw new Error("TGALoader: Truncated RLE pixel.");
  }
  const pixel = bytes.subarray(sourceOffset, sourceOffset + bytesPerPixel);
  for (let repeat = 0; repeat < count; repeat++) {
    pixels.set(pixel, targetOffset + repeat * bytesPerPixel);
  }
  return sourceOffset + bytesPerPixel;
}

/** Inputs required to resolve one indexed TGA pixel through its palette. */
export interface TGAIndexedPixelContext {
  /** Encoded palette index bytes. */
  source: Uint8Array;
  /** Offset of the indexed pixel in the source bytes. */
  sourceOffset: number;
  /** Bytes occupied by one source palette index. */
  bytesPerPixel: number;
  /** Raw palette entries in source order. */
  palette: Uint8Array;
  /** Bytes occupied by one palette entry. */
  paletteBytesPerEntry: number;
  /** Declared bit depth of each palette entry. */
  colorMapSize: number;
  /** First palette index represented by the palette. */
  colorMapIndex: number;
  /** Number of entries available in the palette. */
  colorMapLength: number;
}

/** Decodes one indexed pixel by looking up its palette entry. */
export function decodeIndexedPixel(ctx: TGAIndexedPixelContext): Pixel {
  const index =
    ctx.bytesPerPixel === 1
      ? (ctx.source[ctx.sourceOffset] ?? 0)
      : (ctx.source[ctx.sourceOffset] ?? 0) |
        ((ctx.source[ctx.sourceOffset + 1] ?? 0) << 8);
  const paletteIndex = index - ctx.colorMapIndex;
  if (paletteIndex < 0 || paletteIndex >= ctx.colorMapLength) {
    throw new Error(`TGALoader: Color map index ${index} is out of range.`);
  }
  return decodeColorMapEntry(
    ctx.palette,
    paletteIndex * ctx.paletteBytesPerEntry,
    ctx.paletteBytesPerEntry,
    ctx.colorMapSize,
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
      red: palette[offset + 2] ?? 0,
      green: palette[offset + 1] ?? 0,
      blue: palette[offset] ?? 0,
      alpha: 255,
    };
  }
  return {
    red: palette[offset + 2] ?? 0,
    green: palette[offset + 1] ?? 0,
    blue: palette[offset] ?? 0,
    alpha: palette[offset + 3] ?? 0,
  };
}

/** Decodes a true-color, grayscale, or packed TGA pixel into RGBA. */
export function decodePixel(
  source: Uint8Array,
  offset: number,
  header: TGAHeader,
): Pixel {
  if (
    header.imageType === TGA_TYPE_GRAYSCALE ||
    header.imageType === TGA_TYPE_RLE_GRAYSCALE
  ) {
    const gray = source[offset] ?? 0;
    return {
      red: gray,
      green: gray,
      blue: gray,
      alpha: header.pixelDepth === 16 ? (source[offset + 1] ?? 0) : 255,
    };
  }
  if (header.pixelDepth === 16) {
    return decodePackedColor(source, offset, true);
  }
  if (header.pixelDepth === 24) {
    return {
      red: source[offset + 2] ?? 0,
      green: source[offset + 1] ?? 0,
      blue: source[offset] ?? 0,
      alpha: 255,
    };
  }
  return {
    red: source[offset + 2] ?? 0,
    green: source[offset + 1] ?? 0,
    blue: source[offset] ?? 0,
    alpha: source[offset + 3] ?? 0,
  };
}

function decodePackedColor(
  source: Uint8Array,
  offset: number,
  withAlpha: boolean,
): Pixel {
  const color = (source[offset] ?? 0) | ((source[offset + 1] ?? 0) << 8);
  return {
    red: (color & 0x7c00) >> 7,
    green: (color & 0x03e0) >> 2,
    blue: (color & 0x001f) << 3,
    alpha: withAlpha && color & 0x8000 ? 0 : 255,
  };
}
