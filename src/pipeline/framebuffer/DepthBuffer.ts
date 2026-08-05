/** Uint16Array depth buffer for early-Z rejection. */
export class DepthBuffer {
  #width: number;
  #height: number;
  #data: Uint16Array;

  /** Constructs a Uint16 depth buffer for the requested pixel dimensions. */
  constructor(width: number, height: number) {
    this.#width = width;
    this.#height = height;
    this.#data = new Uint16Array(width * height);
    this.#data.fill(0xffff);
  }

  /** Framebuffer width in pixels. */
  get width(): number {
    return this.#width;
  }

  /** Framebuffer height in pixels. */
  get height(): number {
    return this.#height;
  }

  /** Uint16 depth values indexed by framebuffer pixel. */
  get data(): Uint16Array {
    return this.#data;
  }

  /** Clears all depth values to far plane (0xFFFF). */
  clear(): void {
    this.#data.fill(0xffff);
  }

  /**
   * Tests a fragment's depth against the stored value and updates if closer.
   * @param depth Uint16 depth value (0 = near, 65535 = far)
   * @returns true if the fragment passes (is closer than stored)
   */
  testAndSet(x: number, y: number, depth: number): boolean {
    const idx = y * this.#width + x;
    if (depth > this.#data[idx]) return false;
    this.#data[idx] = depth;
    return true;
  }

  /** Resizes the Uint16 depth storage and resets all values to the far plane. */
  resize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
    this.#data = new Uint16Array(width * height);
    this.#data.fill(0xffff);
  }
}
