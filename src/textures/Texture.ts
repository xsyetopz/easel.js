import { Wrapping } from "../core/Constants.ts";

const MAX_SIZE = 128;

let _textureId = 0;

type ImageSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/**
 * Texture with a hard 128x128 maximum. On needsUpdate, source images
 * are clamped to 128x128 via nearest-neighbor resampling.
 */
export class Texture {
  static BRIGHTNESS_LEVELS = 4;

  id: number = _textureId++;

  name = "";

  wrapS: number = Wrapping.ClampToEdge;

  wrapT: number = Wrapping.ClampToEdge;

  image: ImageSource | undefined;

  #data: ImageData | undefined = undefined;

  #brightnessLevels: Uint8ClampedArray[] | undefined = undefined;

  #needsUpdate = false;

  constructor(image: ImageSource | undefined = void 0) {
    this.image = image;
  }

  get needsUpdate(): boolean {
    return this.#needsUpdate;
  }

  set needsUpdate(value: boolean) {
    if (value) {
      this.#clampAndCache();
      this.#brightnessLevels = undefined;
    }
    this.#needsUpdate = value;
  }

  /** Cached pixel data, clamped to 128x128. */
  get data(): ImageData | undefined {
    return this.#data;
  }

  get width(): number {
    return this.#data ? this.#data.width : 0;
  }

  get height(): number {
    return this.#data ? this.#data.height : 0;
  }

  /**
   * Pre-multiplied brightness variants of the texture pixel data.
   * Lazily built on first access, invalidated on needsUpdate/dispose.
   */
  get brightnessLevels(): Uint8ClampedArray[] | undefined {
    if (!this.data) return void 0;
    if (!this.#brightnessLevels) this.#buildBrightnessLevels();
    return this.#brightnessLevels;
  }

  #buildBrightnessLevels(): void {
    const imgData = this.data;
    if (!imgData) return;
    const src = imgData.data;
    const len = src.length;
    const N = Texture.BRIGHTNESS_LEVELS;
    const levels: Uint8ClampedArray[] = new Array(N);
    for (let i = 0; i < N; i++) {
      const factor = (i + 1) / N;
      const dst = new Uint8ClampedArray(len);
      for (let j = 0; j < len; j += 4) {
        dst[j] = (src[j] * factor + 0.5) | 0;
        dst[j + 1] = (src[j + 1] * factor + 0.5) | 0;
        dst[j + 2] = (src[j + 2] * factor + 0.5) | 0;
        dst[j + 3] = src[j + 3];
      }
      levels[i] = dst;
    }
    this.#brightnessLevels = levels;
  }

  #clampAndCache(): void {
    if (!this.image) return;

    const src = this.image;
    const sw = src.width || 0;
    const sh = src.height || 0;
    if (sw === 0 || sh === 0) return;

    const dw = Math.min(sw, MAX_SIZE);
    const dh = Math.min(sh, MAX_SIZE);

    const canvas =
      typeof OffscreenCanvas === "undefined"
        ? document.createElement("canvas")
        : new OffscreenCanvas(dw, dh);
    canvas.width = dw;
    canvas.height = dh;

    const ctx = canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | undefined;
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, dw, dh);

    this.#data = ctx.getImageData(0, 0, dw, dh);
  }

  clone(): Texture {
    return new Texture(this.image);
  }

  dispose(): void {
    this.image = undefined;
    this.#data = undefined;
    this.#brightnessLevels = undefined;
  }
}
