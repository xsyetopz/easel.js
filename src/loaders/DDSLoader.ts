import { DataTexture } from "../textures/DataTexture.ts";
import { DataTextureLoader } from "./DataTextureLoader.ts";

const DDS_MAGIC = 0x20534444;
const DDS_HEADER_BYTES = 128;
const DDS_HEADER_SIZE = 124;
const DDS_PIXEL_FORMAT_SIZE = 32;
const DDSD_MIPMAPCOUNT = 0x20000;
const DDPF_ALPHAPIXELS = 0x1;
const DDPF_FOURCC = 0x4;
const DDPF_RGB = 0x40;
const DDSCAPS2_CUBEMAP = 0x200;
const MAX_MIPMAPS = 32;
const MAX_OUTPUT_BYTES = 256 * 1024 * 1024;

/** Packed byte order accepted by the CPU DDS decoder. */
export type DDSPixelFormat = "rgba8" | "bgra8" | "rgb8" | "bgr8";

/** One tightly packed RGBA mip level decoded from a DDS image. */
export interface DDSMipmap {
  /** CPU RGBA pixels in top-to-bottom row order. */
  readonly data: Uint8ClampedArray;
  /** Mip level width in source pixels. */
  readonly width: number;
  /** Mip level height in source pixels. */
  readonly height: number;
}

/** CPU representation returned by {@link DDSLoader.parse}. */
export interface DDSParseResult {
  /** Base-level RGBA pixels used by {@link DataTextureLoader.load}. */
  readonly data: Uint8ClampedArray;
  /** Base-level source width. */
  readonly width: number;
  /** Base-level source height. */
  readonly height: number;
  /** Decoded mip levels, beginning with the base level. */
  readonly mipmaps: readonly DDSMipmap[];
  /** Number of decoded mip levels. */
  readonly mipmapCount: number;
  /** Whether the source advertised a cube texture. */
  readonly isCubemap: boolean;
  /** Uncompressed source byte layout. */
  readonly pixelFormat: DDSPixelFormat;
  /** Explicitly identifies the CPU-only decode path. */
  readonly compressed: false;
}

/**
 * Decodes portable, uncompressed DDS images for Canvas2D textures.
 *
 * THREE's DDSLoader primarily preserves compressed DXT/BC payloads for a
 * WebGL compressed texture. EASEL has no compressed GPU texture path, so this
 * loader deliberately decodes only DDPF_RGB 24/32-bit RGBA/BGRA images into
 * CPU RGBA bytes. DXT, BCn, ETC, DX10, and cubemap payloads are rejected with
 * an explicit boundary rather than being mistaken for ordinary pixels.
 */
export class DDSLoader extends DataTextureLoader {
  /** Parses a DDS ArrayBuffer into tightly packed top-to-bottom RGBA pixels. */
  override parse(buffer: ArrayBuffer, loadMipmaps = true): DDSParseResult {
    if (!(buffer instanceof ArrayBuffer)) {
      throw new TypeError("DDSLoader: Expected an ArrayBuffer.");
    }
    if (buffer.byteLength < DDS_HEADER_BYTES) {
      throw new Error("DDSLoader: Not enough data to contain the header.");
    }

    const view = new DataView(buffer);
    validateHeader(view);

    const width = view.getUint32(16, true);
    const height = view.getUint32(12, true);
    const flags = view.getUint32(8, true);
    const mipmapCount = readMipmapCount(view, flags, loadMipmaps);
    const pixelFormat = readPixelFormat(view);
    const isCubemap = (view.getUint32(116, true) & DDSCAPS2_CUBEMAP) !== 0;
    if (isCubemap) {
      throw new Error(
        "DDSLoader: Cubemap DDS data cannot be represented by a 2D DataTexture.",
      );
    }

    const bytesPerPixel = pixelFormat.bitsPerPixel >> 3;
    const pitch = view.getUint32(20, true);
    let dataOffset = DDS_HEADER_BYTES;
    const mipmaps: DDSMipmap[] = [];
    let mipWidth = width;
    let mipHeight = height;
    let decodedBytes = 0;

    for (let level = 0; level < mipmapCount; level++) {
      const tightRowBytes = mipWidth * bytesPerPixel;
      if (level === 0 && pitch !== 0 && pitch < tightRowBytes) {
        throw new Error("DDSLoader: DDS pitch is smaller than a source row.");
      }
      const rowBytes =
        level === 0 ? Math.max(tightRowBytes, pitch) : tightRowBytes;
      const levelByteLength = rowBytes * mipHeight;
      const outputByteLength = mipWidth * mipHeight * 4;
      if (
        !((Number.isSafeInteger(levelByteLength) &&Number.isSafeInteger(outputByteLength) ) &&Number.isSafeInteger(dataOffset + levelByteLength) ) ||
        dataOffset + levelByteLength > buffer.byteLength
      ) {
        throw new Error(
          `DDSLoader: Truncated pixel data at mip level ${level}.`,
        );
      }
      if (decodedBytes + outputByteLength > MAX_OUTPUT_BYTES) {
        throw new Error("DDSLoader: Mipmaps are too large for CPU decoding.");
      }

      const data = decodeMipLevel(
        view,
        dataOffset,
        rowBytes,
        mipWidth,
        mipHeight,
        pixelFormat,
      );
      mipmaps.push({ data, width: mipWidth, height: mipHeight });
      decodedBytes += outputByteLength;
      dataOffset += levelByteLength;
      mipWidth = Math.max(1, mipWidth >> 1);
      mipHeight = Math.max(1, mipHeight >> 1);
    }

    const base = mipmaps[0];
    if (base === undefined) {
      throw new Error("DDSLoader: DDS image did not contain a base mip level.");
    }
    return {
      data: base.data,
      width,
      height,
      mipmaps: Object.freeze(mipmaps),
      mipmapCount: mipmaps.length,
      isCubemap,
      pixelFormat: pixelFormat.name,
      compressed: false,
    };
  }

  /** Converts one decoded mip level into a bounded CPU DataTexture. */
  toDataTexture(result: DDSParseResult, mipmap = 0): DataTexture {
    if (
      !Number.isSafeInteger(mipmap) ||
      mipmap < 0 ||
      mipmap >= result.mipmaps.length
    ) {
      throw new RangeError(
        `DDSLoader: Mip level must be an integer from 0 through ${result.mipmaps.length - 1}.`,
      );
    }
    const level = result.mipmaps[mipmap];
    if (level === undefined) {
      throw new RangeError(`DDSLoader: Mip level ${mipmap} is unavailable.`);
    }
    const texture = new DataTexture(level.data, level.width, level.height);
    texture.buildBrightnessLevels();
    return texture;
  }
}

interface PixelFormatInfo {
  readonly name: DDSPixelFormat;
  readonly bitsPerPixel: 24 | 32;
  readonly redMask: number;
  readonly greenMask: number;
  readonly blueMask: number;
  readonly alphaMask: number;
}

function validateHeader(view: DataView): void {
  if (view.getUint32(0, true) !== DDS_MAGIC) {
    throw new Error("DDSLoader: Invalid magic number in DDS header.");
  }
  if (view.getUint32(4, true) !== DDS_HEADER_SIZE) {
    throw new Error("DDSLoader: Invalid header size.");
  }
  if (view.getUint32(76, true) !== DDS_PIXEL_FORMAT_SIZE) {
    throw new Error("DDSLoader: Invalid pixel-format header size.");
  }
  const width = view.getUint32(16, true);
  const height = view.getUint32(12, true);
  if (width === 0 || height === 0) {
    throw new Error("DDSLoader: Invalid image dimensions.");
  }
  if (
    !Number.isSafeInteger(width * height) ||
    width * height * 4 > MAX_OUTPUT_BYTES
  ) {
    throw new Error("DDSLoader: Image is too large for CPU decoding.");
  }
}

function readMipmapCount(
  view: DataView,
  flags: number,
  loadMipmaps: boolean,
): number {
  if (!loadMipmaps || (flags & DDSD_MIPMAPCOUNT) === 0) return 1;
  const value = Math.max(1, view.getUint32(28, true));
  if (value > MAX_MIPMAPS) {
    throw new Error(`DDSLoader: Refusing to decode ${value} mip levels.`);
  }
  return value;
}

function readPixelFormat(view: DataView): PixelFormatInfo {
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

  const name =
    bitsPerPixel === 32
      ? redMask < blueMask
        ? "rgba8"
        : "bgra8"
      : redMask < blueMask
        ? "rgb8"
        : "bgr8";
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

function decodeMipLevel(
  view: DataView,
  offset: number,
  rowBytes: number,
  width: number,
  height: number,
  format: PixelFormatInfo,
): Uint8ClampedArray {
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
