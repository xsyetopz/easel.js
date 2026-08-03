/**
 * Reads a region of the current framebuffer into a texture for a
 * subsequent draw pass. CPU render-to-texture.
 */
export class FramebufferTexture {
  #data: ImageData | undefined = undefined;
  #width: number;
  #height: number;

  constructor(width: number, height: number) {
    this.#width = width;
    this.#height = height;
  }

  get width(): number {
    return this.#width;
  }

  get height(): number {
    return this.#height;
  }

  get data(): ImageData | undefined {
    return this.#data;
  }

  /** Capture a region from the given ImageData source. */
  capture(source: ImageData, x = 0, y = 0): void {
    const w = this.#width;
    const h = this.#height;
    const pixels = new Uint8ClampedArray(w * h * 4);
    const srcData = source.data;
    const srcW = source.width;

    for (let row = 0; row < h; row++) {
      const srcOffset = ((y + row) * srcW + x) * 4;
      const dstOffset = row * w * 4;
      for (let col = 0; col < w * 4; col++) {
        pixels[dstOffset + col] = srcData[srcOffset + col];
      }
    }

    this.#data = new ImageData(pixels, w, h);
  }

  dispose(): void {
    this.#data = undefined;
  }
}
