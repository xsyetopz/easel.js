import type { Framebuffer } from "./Framebuffer.ts";

interface TextureImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Clears color storage to the requested value; callers clear the depth buffer separately. */
export class FramebufferClear {
  /** Fills color storage with the packed RGBA clear value. */
  clear(
    framebuffer: Framebuffer,
    r: number = 0,
    g: number = 0,
    b: number = 0,
    a: number = 255,
  ): void {
    // ImageData is RGBA byte order; on little-endian Uint32Array reads ABGR.
    const packed = (a << 24) | (b << 16) | (g << 8) | r;
    framebuffer.u32.fill(packed);
  }

  /** Copies a source texture into the framebuffer with nearest-neighbor scaling. */
  clearTexture(framebuffer: Framebuffer, texture: TextureImageData): void {
    const src = texture.data;
    const srcWidth = texture.width;
    const srcHeight = texture.height;
    if (srcWidth <= 0 || srcHeight <= 0) return;

    const dst = framebuffer.data;
    const dstWidth = framebuffer.width;
    const dstHeight = framebuffer.height;
    for (let y = 0; y < dstHeight; y++) {
      const srcY = ((y * srcHeight) / dstHeight) | 0;
      for (let x = 0; x < dstWidth; x++) {
        const srcX = ((x * srcWidth) / dstWidth) | 0;
        const srcIndex = (srcY * srcWidth + srcX) << 2;
        const dstIndex = (y * dstWidth + x) << 2;
        dst[dstIndex] = src[srcIndex];
        dst[dstIndex + 1] = src[srcIndex + 1];
        dst[dstIndex + 2] = src[srcIndex + 2];
        dst[dstIndex + 3] = src[srcIndex + 3];
      }
    }
  }
}
