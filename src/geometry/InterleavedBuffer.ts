type TypedArray = Float32Array | Int32Array | Uint32Array | Uint16Array;

/** Packed buffer storing multiple vertex attributes in interleaved layout. */
export class InterleavedBuffer {
  #array: TypedArray;
  #stride: number;

  needsUpdate = false;

  updateRange: { offset: number; count: number } = { offset: 0, count: -1 };

  constructor(array: TypedArray, stride: number) {
    this.#array = array;
    this.#stride = stride;
  }

  get array(): TypedArray {
    return this.#array;
  }

  get stride(): number {
    return this.#stride;
  }

  get count(): number {
    return this.#array.length / this.#stride;
  }

  clone(): InterleavedBuffer {
    return new InterleavedBuffer(this.#array.slice(), this.#stride);
  }

  copy(source: InterleavedBuffer): this {
    this.#array.set(source.array);
    return this;
  }

  set(value: ArrayLike<number>, offset: number): this {
    this.#array.set(value, offset);
    return this;
  }

  getX(index: number): number {
    return this.#array[index * this.#stride];
  }

  getY(index: number): number {
    return this.#array[index * this.#stride + 1];
  }

  getZ(index: number): number {
    return this.#array[index * this.#stride + 2];
  }

  getW(index: number): number {
    return this.#array[index * this.#stride + 3];
  }
}
