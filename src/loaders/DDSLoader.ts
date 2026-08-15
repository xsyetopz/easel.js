import { DataTexture } from "../textures/DataTexture.ts";
import { DataTextureLoader } from "./DataTextureLoader.ts";
import {
  type DecodeMipLevelOptions,
  type PixelFormatInfo,
  decodeMipLevel,
  readMipmapCount,
  readPixelFormat,
  validateHeader,
} from "./_DDSLoaderHelpers.ts";

const DDS_HEADER_BYTES = 128;
const DDSCAPS2_CUBEMAP = 0x200;
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

interface MipmapDecodeState {
  mipmaps: DDSMipmap[];
  dataOffset: number;
  decodedBytes: number;
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

    const pitch = view.getUint32(20, true);
    const state = decodeAllMipmaps(
      view,
      mipmapCount,
      width,
      height,
      pitch,
      pixelFormat,
      buffer.byteLength,
    );
    const base = state.mipmaps[0];
    if (base === undefined) {
      throw new Error("DDSLoader: DDS image did not contain a base mip level.");
    }
    return {
      data: base.data,
      width,
      height,
      mipmaps: Object.freeze(state.mipmaps),
      mipmapCount: state.mipmaps.length,
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

function decodeAllMipmaps(
  view: DataView,
  mipmapCount: number,
  width: number,
  height: number,
  pitch: number,
  pixelFormat: PixelFormatInfo,
  bufferLength: number,
): MipmapDecodeState {
  const bytesPerPixel = pixelFormat.bitsPerPixel >> 3;
  const mipmaps: DDSMipmap[] = [];
  let dataOffset = DDS_HEADER_BYTES;
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
    validateMipBounds(
      levelByteLength,
      outputByteLength,
      dataOffset,
      bufferLength,
      level,
    );
    if (decodedBytes + outputByteLength > MAX_OUTPUT_BYTES) {
      throw new Error("DDSLoader: Mipmaps are too large for CPU decoding.");
    }
    const options: DecodeMipLevelOptions = {
      view,
      offset: dataOffset,
      rowBytes,
      width: mipWidth,
      height: mipHeight,
      format: pixelFormat,
    };
    const data = decodeMipLevel(options);
    mipmaps.push({ data, width: mipWidth, height: mipHeight });
    decodedBytes += outputByteLength;
    dataOffset += levelByteLength;
    mipWidth = Math.max(1, mipWidth >> 1);
    mipHeight = Math.max(1, mipHeight >> 1);
  }
  return { mipmaps, dataOffset, decodedBytes };
}

function validateMipBounds(
  levelByteLength: number,
  outputByteLength: number,
  dataOffset: number,
  bufferLength: number,
  level: number,
): void {
  if (
    !(
      Number.isSafeInteger(levelByteLength) &&
      Number.isSafeInteger(outputByteLength) &&
      Number.isSafeInteger(dataOffset + levelByteLength)
    ) ||
    dataOffset + levelByteLength > bufferLength
  ) {
    throw new Error(`DDSLoader: Truncated pixel data at mip level ${level}.`);
  }
}
