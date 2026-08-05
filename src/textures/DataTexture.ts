import type { Wrapping as WrappingMode } from "../core/Constants.ts";
import { Texture, type TextureImageSource } from "./Texture.ts";

const DEFAULT_LINEAR_MAPPING = 300;
const DEFAULT_RGBA_FORMAT = 1023;
const DEFAULT_UNSIGNED_BYTE_TYPE = 1009;
const DEFAULT_NEAREST_FILTER = 1003;
const DEFAULT_ANISOTROPY = 1;
const DEFAULT_NO_COLOR_SPACE = "";
const MAX_SIZE = 128;

/** Texture created directly from raw RGBA pixel data. */
export class DataTexture extends Texture {
  /** String marker identifying this concrete texture subtype. */
  readonly isDataTexture = true;

  #imageData: ImageData | undefined;
  #width = 0;
  #height = 0;

  /** Constructs a nearest-neighbor texture from raw pixel data. */
  constructor(
    data?: Uint8ClampedArray,
    width = 1,
    height = 1,
    format = DEFAULT_RGBA_FORMAT,
    type = DEFAULT_UNSIGNED_BYTE_TYPE,
    mapping = DEFAULT_LINEAR_MAPPING,
    wrapS: WrappingMode = 0,
    wrapT: WrappingMode = 0,
    magFilter = DEFAULT_NEAREST_FILTER,
    minFilter = DEFAULT_NEAREST_FILTER,
    anisotropy = DEFAULT_ANISOTROPY,
    colorSpace = DEFAULT_NO_COLOR_SPACE,
  ) {
    super(
      undefined,
      mapping,
      wrapS,
      wrapT,
      magFilter,
      minFilter,
      format,
      type,
      anisotropy,
      colorSpace,
    );
    this.flipY = false;
    this.unpackAlignment = 1;
    const sourceWidth = validateDimension(width, "width");
    const sourceHeight = validateDimension(height, "height");
    this.#width = Math.min(MAX_SIZE, sourceWidth);
    this.#height = Math.min(MAX_SIZE, sourceHeight);
    this.image = {
      data,
      width: sourceWidth,
      height: sourceHeight,
    } as TextureImageSource;
    if (data !== undefined) {
      this.#imageData = createDataImage(data, width, height);
    }
  }

  /** Raw image or pixel payload used to populate this data texture. */
  override get image(): TextureImageSource {
    return super.image;
  }

  /** Replaces raw source data and clears the cached CPU image. */
  override set image(value: TextureImageSource) {
    super.image = value;
    this.#imageData = undefined;
  }

  /** Cached raw pixel data. */
  override get data(): ImageData | undefined {
    return this.#imageData;
  }

  /** Pixel width. */
  override get width(): number {
    return this.#imageData?.width ?? this.#width;
  }

  /** Pixel height. */
  override get height(): number {
    return this.#imageData?.height ?? this.#height;
  }

  /** Refreshes the CPU cache from mutated raw source data. */
  override update(): this {
    if (this.needsUpdate) {
      const source = this.image;
      if (isRawImage(source)) {
        this.#imageData = createDataImage(
          source.data,
          source.width,
          source.height,
        );
      }
    }
    return super.update();
  }

  /** Returns an independent DataTexture copy. */
  override clone(): DataTexture {
    return new DataTexture().copy(this);
  }

  /** Copies data texture state and clones its raw pixel payload. */
  override copy(source: Texture): this {
    super.copy(source);
    const image = source.data;
    this.#imageData = image ? cloneDataImage(image) : undefined;
    this.#width = source.width;
    this.#height = source.height;
    return this;
  }

  /** Releases raw pixel data and shared source state. */
  override dispose(): void {
    this.#imageData = undefined;
    this.#width = 0;
    this.#height = 0;
    super.dispose();
  }
}

function validateDimension(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `DataTexture ${label} must be a non-negative safe integer.`,
    );
  }
  return value;
}

function createDataImage(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageData {
  const sourceWidth = validateDimension(width, "width");
  const sourceHeight = validateDimension(height, "height");
  if (data.length !== sourceWidth * sourceHeight * 4) {
    throw new RangeError(
      "DataTexture data length must equal width * height * 4.",
    );
  }
  const targetWidth = Math.min(MAX_SIZE, sourceWidth);
  const targetHeight = Math.min(MAX_SIZE, sourceHeight);
  const pixels = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let row = 0; row < targetHeight; row++) {
    const sourceOffset = row * sourceWidth * 4;
    const targetOffset = row * targetWidth * 4;
    pixels.set(
      data.subarray(sourceOffset, sourceOffset + targetWidth * 4),
      targetOffset,
    );
  }
  const ImageDataConstructor = globalThis.ImageData;
  if (ImageDataConstructor !== undefined) {
    return new ImageDataConstructor(pixels, targetWidth, targetHeight);
  }
  return {
    data: pixels,
    width: targetWidth,
    height: targetHeight,
    colorSpace: "srgb",
  } as ImageData;
}

function isRawImage(
  value: TextureImageSource,
): value is { data: Uint8ClampedArray; width: number; height: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    value.data instanceof Uint8ClampedArray &&
    typeof value.width === "number" &&
    typeof value.height === "number"
  );
}

function cloneDataImage(image: ImageData): ImageData {
  const data = new Uint8ClampedArray(image.data);
  const ImageDataConstructor = globalThis.ImageData;
  if (ImageDataConstructor !== undefined) {
    return new ImageDataConstructor(data, image.width, image.height);
  }
  return {
    data,
    width: image.width,
    height: image.height,
    colorSpace: "srgb",
  } as ImageData;
}
