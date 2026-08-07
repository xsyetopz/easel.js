import { Texture, type TextureImageSource } from "./Texture.ts";

/** CPU render-to-texture target populated from a framebuffer image. */
export class FramebufferTexture extends Texture {
  /** String marker identifying this concrete texture subtype. */
  readonly isFramebufferTexture = true;

  /** Whether this texture belongs to a CPU render target. */
  get isRenderTargetTexture(): boolean {
    return true;
  }

  #framebufferData: ImageData | undefined;
  #targetWidth: number;
  #targetHeight: number;

  /** Constructs a CPU render-to-texture target with the requested dimensions. */
  constructor(width = 1, height = 1) {
    super({ width, height } as TextureImageSource);
    this.#targetWidth = validateDimension(width, "width");
    this.#targetHeight = validateDimension(height, "height");
    this.needsUpdate = true;
  }

  /** Target width. */
  override get width(): number {
    return this.#targetWidth;
  }

  /** Target height. */
  override get height(): number {
    return this.#targetHeight;
  }

  /** Captured framebuffer pixels. */
  override get data(): ImageData | undefined {
    return this.#framebufferData;
  }

  /** Returns an independent framebuffer texture copy. */
  override clone(): FramebufferTexture {
    return new FramebufferTexture(this.#targetWidth, this.#targetHeight).copy(
      this,
    );
  }

  /** Copies framebuffer state and captured pixels. */
  override copy(source: Texture): this {
    super.copy(source);
    this.#framebufferData = source.data
      ? cloneImageData(source.data)
      : undefined;
    return this;
  }

  /** Captures a region from an ImageData framebuffer source. */
  capture(source: ImageData, x = 0, y = 0): void {
    const width = this.#targetWidth;
    const height = this.#targetHeight;
    const pixels = new Uint8ClampedArray(width * height * 4);
    const sourceData = source.data;
    for (let row = 0; row < height; row++) {
      const sourceY = y + row;
      if (sourceY < 0 || sourceY >= source.height) continue;
      for (let column = 0; column < width; column++) {
        const sourceX = x + column;
        if (sourceX < 0 || sourceX >= source.width) continue;
        const sourceOffset = (sourceY * source.width + sourceX) * 4;
        const targetOffset = (row * width + column) * 4;
        pixels[targetOffset] = sourceData[sourceOffset] ?? 0;
        pixels[targetOffset + 1] = sourceData[sourceOffset + 1] ?? 0;
        pixels[targetOffset + 2] = sourceData[sourceOffset + 2] ?? 0;
        pixels[targetOffset + 3] = sourceData[sourceOffset + 3] ?? 0;
      }
    }
    this.#framebufferData = createImageData(pixels, width, height);
    this.image = this.#framebufferData;
    this.needsUpdate = true;
  }

  /** Releases captured framebuffer pixels. */
  override dispose(): void {
    this.#framebufferData = undefined;
    super.dispose();
  }
}

function validateDimension(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `FramebufferTexture ${label} must be a non-negative safe integer.`,
    );
  }
  return value;
}

function cloneImageData(data: ImageData): ImageData {
  return createImageData(
    new Uint8ClampedArray(data.data),
    data.width,
    data.height,
  );
}

function createImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageData {
  const ImageDataConstructor = globalThis.ImageData;
  if (ImageDataConstructor !== undefined) {
    return new ImageDataConstructor(
      data as Uint8ClampedArray<ArrayBuffer>,
      width,
      height,
    );
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}
