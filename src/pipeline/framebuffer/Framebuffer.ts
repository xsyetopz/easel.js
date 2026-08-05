import { DepthBuffer } from "./DepthBuffer.ts";

interface ImageDataLike {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** RGBA byte buffer with a Uint32 view for packed CPU writes. */
export class Framebuffer {
  #width: number;
  #height: number;
  #imageData: ImageDataLike;
  #data: Uint8ClampedArray;
  #u32: Uint32Array;
  #depthBuffer: DepthBuffer;

  /** Constructs RGBA color and Uint16 depth storage for the requested dimensions. */
  constructor(width: number, height: number) {
    this.#width = width;
    this.#height = height;
    this.#imageData = this.#createImageData(width, height);
    this.#data = this.#imageData.data;
    this.#u32 = new Uint32Array(
      this.#data.buffer,
      this.#data.byteOffset,
      this.#data.byteLength >> 2,
    );
    this.#depthBuffer = new DepthBuffer(width, height);
  }

  #createImageData(width: number, height: number): ImageDataLike {
    if (typeof globalThis.ImageData !== "undefined") {
      return new globalThis.ImageData(width, height);
    }
    return { data: new Uint8ClampedArray(width * height * 4), width, height };
  }

  /** Current color-buffer width in pixels. */
  get width(): number {
    return this.#width;
  }

  /** Current color-buffer height in pixels. */
  get height(): number {
    return this.#height;
  }

  /** Canvas-compatible ImageData-like view backed by the framebuffer. */
  get imageData(): ImageDataLike {
    return this.#imageData;
  }

  /** Raw pixel or depth storage backing this object. */
  get data(): Uint8ClampedArray {
    return this.#data;
  }

  /** Uint32 view used for packed RGBA writes. */
  get u32(): Uint32Array {
    return this.#u32;
  }

  /** Uint16 depth buffer used for CPU early-Z tests. */
  get depthBuffer(): DepthBuffer {
    return this.#depthBuffer;
  }

  /** Writes one packed RGBA pixel at integer framebuffer coordinates. */
  setPixel(
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    a: number = 255,
  ): void {
    const idx = (y * this.#width + x) << 2;
    this.#data[idx] = r;
    this.#data[idx + 1] = g;
    this.#data[idx + 2] = b;
    this.#data[idx + 3] = a;
  }

  /** Reads one packed RGBA pixel at integer framebuffer coordinates. */
  getPixel(
    x: number,
    y: number,
  ): { r: number; g: number; b: number; a: number } {
    const idx = (y * this.#width + x) << 2;
    return {
      r: this.#data[idx],
      g: this.#data[idx + 1],
      b: this.#data[idx + 2],
      a: this.#data[idx + 3],
    };
  }

  /** Resizes color and depth storage for the requested pixel dimensions. */
  resize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
    this.#imageData = this.#createImageData(width, height);
    this.#data = this.#imageData.data;
    this.#u32 = new Uint32Array(
      this.#data.buffer,
      this.#data.byteOffset,
      this.#data.byteLength >> 2,
    );
    this.#depthBuffer.resize(width, height);
  }
}
