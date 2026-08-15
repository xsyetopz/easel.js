import type { DDSPixelFormat } from "./DDSLoader.ts";

/** Channel masks and storage width for a supported DDS pixel format. */
export interface PixelFormatInfo {
  /** Recognized DDS pixel format. */
  readonly name: DDSPixelFormat;
  /** Bits stored in each source pixel. */
  readonly bitsPerPixel: 24 | 32;
  /** Red channel bit mask. */
  readonly redMask: number;
  /** Green channel bit mask. */
  readonly greenMask: number;
  /** Blue channel bit mask. */
  readonly blueMask: number;
  /** Alpha channel bit mask. */
  readonly alphaMask: number;
}

/** Parameters for decoding one DDS mip level. */
export interface DecodeMipLevelOptions {
  /** Source byte view. */
  view: DataView;
  /** Offset of the mip-level data. */
  offset: number;
  /** Source row width in bytes. */
  rowBytes: number;
  /** Mip-level width in pixels. */
  width: number;
  /** Mip-level height in pixels. */
  height: number;
  /** Source pixel format. */
  format: PixelFormatInfo;
}

const DDPF_ALPHAPIXELS = 0x1;
const DDPF_FOURCC = 0x4;
const DDPF_RGB = 0x40;

/** Validates DDS magic, header sizes, dimensions, and CPU decode limits. */
export function validateHeader(view: DataView): void {
  if (view.getUint32(0, true) !== 0x20534444) {
    throw new Error("DDSLoader: Invalid magic number in DDS header.");
  }
  if (view.getUint32(4, true) !== 124) {
    throw new Error("DDSLoader: Invalid header size.");
  }
  if (view.getUint32(76, true) !== 32) {
    throw new Error("DDSLoader: Invalid pixel-format header size.");
  }
  const width = view.getUint32(16, true);
  const height = view.getUint32(12, true);
  if (width === 0 || height === 0) {
    throw new Error("DDSLoader: Invalid image dimensions.");
  }
  if (
    !Number.isSafeInteger(width * height) ||
    width * height * 4 > 256 * 1024 * 1024
  ) {
    throw new Error("DDSLoader: Image is too large for CPU decoding.");
  }
}

/** Reads and bounds the number of mip levels requested from a DDS header. */
export function readMipmapCount(
  view: DataView,
  flags: number,
  loadMipmaps: boolean,
): number {
  if (!loadMipmaps || (flags & 0x20000) === 0) return 1;
  const value = Math.max(1, view.getUint32(28, true));
  if (value > 32) {
    throw new Error(`DDSLoader: Refusing to decode ${value} mip levels.`);
  }
  return value;
}

/** Reads and validates the uncompressed DDS channel masks and pixel width. */
export function readPixelFormat(view: DataView): PixelFormatInfo {
  const flags = view.getUint32(80, true);
  const fourCC = view.getUint32(84, true);
  if ((flags & DDPF_FOURCC) !== 0 || fourCC !== 0) {
    throw new Error(
      "DDSLoader: Compressed DXT/BCn DDS textures require a CPU decoder; only uncompressed RGBA/BGRA is supported.",
    );
  }
  if ((flags & DDPF_RGB) === 0) {
    throw new Error(
      "DDSLoader: Unsupported DDS pixel format; expected RGB data.",
    );
  }

  const bitsPerPixel = view.getUint32(88, true);
  if (bitsPerPixel !== 24 && bitsPerPixel !== 32) {
    throw new Error(
      `DDSLoader: Unsupported uncompressed pixel size ${bitsPerPixel}; expected 24 or 32 bits.`,
    );
  }
  const redMask = view.getUint32(92, true);
  const greenMask = view.getUint32(96, true);
  const blueMask = view.getUint32(100, true);
  const alphaMask = view.getUint32(104, true);
  validateChannelMask(redMask, "red");
  validateChannelMask(greenMask, "green");
  validateChannelMask(blueMask, "blue");
  if (bitsPerPixel === 24 && alphaMask !== 0) {
    throw new Error(
      "DDSLoader: A 24-bit DDS image cannot declare an alpha channel.",
    );
  }
  if (alphaMask !== 0) validateChannelMask(alphaMask, "alpha");
  if (
    (redMask & greenMask) !== 0 ||
    (redMask & blueMask) !== 0 ||
    (greenMask & blueMask) !== 0
  ) {
    throw new Error("DDSLoader: DDS color channel masks overlap.");
  }
  if (
    alphaMask !== 0 &&
    ((alphaMask & redMask) !== 0 ||
      (alphaMask & greenMask) !== 0 ||
      (alphaMask & blueMask) !== 0)
  ) {
    throw new Error("DDSLoader: DDS alpha mask overlaps a color channel.");
  }

  const name = resolvePixelFormat(bitsPerPixel, redMask, blueMask);
  if (
    bitsPerPixel === 32 &&
    (flags & DDPF_ALPHAPIXELS) !== 0 &&
    alphaMask === 0
  ) {
    throw new Error(
      "DDSLoader: DDS alpha flag requires an alpha channel mask.",
    );
  }
  return {
    name,
    bitsPerPixel,
    redMask,
    greenMask,
    blueMask,
    alphaMask,
  };
}

function resolvePixelFormat(
  bitsPerPixel: number,
  redMask: number,
  blueMask: number,
): DDSPixelFormat {
  if (bitsPerPixel === 32) {
    return redMask < blueMask ? "rgba8" : "bgra8";
  }
  return redMask < blueMask ? "rgb8" : "bgr8";
}

function validateChannelMask(mask: number, channel: string): void {
  if (mask === 0 || !isContiguousByteMask(mask)) {
    throw new Error(
      `DDSLoader: Unsupported ${channel} channel mask 0x${mask.toString(16)}; expected an 8-bit channel.`,
    );
  }
}

function isContiguousByteMask(mask: number): boolean {
  const value = mask >>> 0;
  const shift = countTrailingZeros(value);
  return shift < 32 && value >>> shift === 255;
}

function countTrailingZeros(value: number): number {
  let shift = 0;
  let current = value >>> 0;
  while ((current & 1) === 0 && shift < 32) {
    current >>>= 1;
    shift++;
  }
  return shift;
}

/** Converts one packed DDS mip level into RGBA8 pixels. */
export function decodeMipLevel(
  options: DecodeMipLevelOptions,
): Uint8ClampedArray {
  const { view, offset, rowBytes, width, height, format } = options;
  const bytesPerPixel = format.bitsPerPixel >> 3;
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sourceRow = offset + y * rowBytes;
    for (let x = 0; x < width; x++) {
      const sourceOffset = sourceRow + x * bytesPerPixel;
      const packed =
        bytesPerPixel === 4
          ? view.getUint32(sourceOffset, true)
          : view.getUint8(sourceOffset) |
            (view.getUint8(sourceOffset + 1) << 8) |
            (view.getUint8(sourceOffset + 2) << 16);
      const target = (y * width + x) * 4;
      output[target] = readChannel(packed, format.redMask);
      output[target + 1] = readChannel(packed, format.greenMask);
      output[target + 2] = readChannel(packed, format.blueMask);
      output[target + 3] =
        format.alphaMask === 0 ? 255 : readChannel(packed, format.alphaMask);
    }
  }
  return output;
}

function readChannel(value: number, mask: number): number {
  const shift = countTrailingZeros(mask);
  return ((value & mask) >>> shift) & 255;
}
