/** Raw pixel payload accepted by the image utilities. */
export type ImagePixelArray = Uint8Array | Uint8ClampedArray | Float32Array;

/** Canvas-compatible image-data shape used by the CPU framebuffer. */
export interface ImageDataLike<
  TArray extends ImagePixelArray = ImagePixelArray,
> {
  /** Pixel payload supplied to the image utility. */
  readonly data: TArray;
  /** Image width in pixels. */
  readonly width: number;
  /** Image height in pixels. */
  readonly height: number;
}

type DrawableImage = HTMLImageElement | HTMLCanvasElement | ImageBitmap;
type DataUrlImage = HTMLImageElement | HTMLCanvasElement | ImageData;
const DATA_URL_PATTERN = /^data:/iu;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document === "undefined") {
    throw new Error("ImageUtils requires a document to allocate a canvas.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("ImageUtils could not acquire a Canvas2D context.");
  }
  return context;
}

function isInstanceOf<T>(
  value: unknown,
  classReference: (new (...args: never[]) => T) | undefined,
): value is T {
  return classReference !== undefined && value instanceof classReference;
}

function isImageDataLike(value: unknown): value is ImageDataLike {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ImageDataLike>;
  return (
    (candidate.data instanceof Uint8Array ||
      candidate.data instanceof Uint8ClampedArray ||
      candidate.data instanceof Float32Array) &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number"
  );
}

function validateImageData(image: ImageDataLike): void {
  if (
    !(
      Number.isSafeInteger(image.width) && Number.isSafeInteger(image.height)
    ) ||
    image.width < 0 ||
    image.height < 0
  ) {
    throw new RangeError(
      "Image dimensions must be non-negative safe integers.",
    );
  }
  if (image.data.length !== image.width * image.height * 4) {
    throw new RangeError("Image data length must equal width * height * 4.");
  }
}

function srgbChannelToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function convertData<TArray extends ImagePixelArray>(
  image: ImageDataLike<TArray>,
): ImageDataLike<TArray> {
  validateImageData(image);
  const data = image.data.slice() as TArray;
  const byteData =
    data instanceof Uint8Array || data instanceof Uint8ClampedArray;
  for (let offset = 0; offset < data.length; offset += 4) {
    for (let channel = 0; channel < 3; channel++) {
      const index = offset + channel;
      const value = byteData ? data[index] / 255 : data[index];
      const linear = srgbChannelToLinear(value);
      data[index] = byteData ? Math.round(linear * 255) : linear;
    }
  }
  return { data, width: image.width, height: image.height };
}

/** Encodes image data as a data URL. */
export function getDataUrl(
  image: DataUrlImage,
  type: string = "image/png",
): string {
  if ("src" in image && DATA_URL_PATTERN.test(image.src)) return image.src;

  const Canvas = globalThis.HTMLCanvasElement;
  if (isInstanceOf(image, Canvas)) return image.toDataURL(type);

  const canvas = createCanvas(image.width, image.height);
  const context = getContext(canvas);
  const ImageDataConstructor = globalThis.ImageData;
  if (isInstanceOf(image, ImageDataConstructor)) {
    context.putImageData(image, 0, 0);
  } else {
    context.drawImage(image, 0, 0, image.width, image.height);
  }
  return canvas.toDataURL(type);
}

type LinearImageResult<TImage> =
  TImage extends ImageDataLike<infer TArray>
    ? ImageDataLike<TArray>
    : HTMLCanvasElement;

/** Converts an sRGB channel in [0, 1] to linear-light space. */
export function srgbToLinear<TImage extends DrawableImage | ImageDataLike>(
  image: TImage,
): LinearImageResult<TImage> {
  if (isImageDataLike(image)) {
    return convertData(image) as LinearImageResult<TImage>;
  }

  const canvas = createCanvas(image.width, image.height);
  const context = getContext(canvas);
  context.drawImage(image, 0, 0, image.width, image.height);
  const source = context.getImageData(0, 0, image.width, image.height);
  const converted = convertData(source);
  source.data.set(converted.data);
  context.putImageData(source, 0, 0);
  return canvas as LinearImageResult<TImage>;
}
