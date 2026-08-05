type TypedArray = Float32Array | Int32Array | Uint32Array | Uint16Array;

/** Packed typed-array storage for multiple strided vertex channels. */
export class InterleavedBuffer {
  #array: TypedArray;
  #stride: number;

  /** Whether consumers must publish the modified packed storage. */
  needsUpdate: boolean = false;

  /** Range of scalar records changed since the previous upload. */
  updateRange: { offset: number; count: number } = { offset: 0, count: -1 };

  /** Constructs packed typed-array storage with a fixed scalar stride. */
  constructor(array: TypedArray, stride: number) {
    this.#array = array;
    this.#stride = stride;
  }

  /** Underlying typed-array storage for the channel. */
  get array(): TypedArray {
    return this.#array;
  }

  /** Number of scalars in each interleaved vertex record. */
  get stride(): number {
    return this.#stride;
  }

  /** Number of interleaved vertex records represented by the buffer. */
  get count(): number {
    return this.#array.length / this.#stride;
  }

  /** Returns an independent copy with cloned mutable state. */
  clone(): InterleavedBuffer {
    return new InterleavedBuffer(this.#array.slice(), this.#stride);
  }

  /** Copies mutable state from another instance. */
  copy(source: InterleavedBuffer): this {
    this.#array.set(source.array);
    return this;
  }

  /** Copies scalar values into the underlying storage at `offset`. */
  set(value: ArrayLike<number>, offset: number): this {
    this.#array.set(value, offset);
    return this;
  }

  /** Reads the x component at a vertex index. */
  getX(index: number): number {
    return this.#array[index * this.#stride];
  }

  /** Reads the y component at a vertex index. */
  getY(index: number): number {
    return this.#array[index * this.#stride + 1];
  }

  /** Reads the z component at a vertex index. */
  getZ(index: number): number {
    return this.#array[index * this.#stride + 2];
  }

  /** Reads the w component at a vertex index. */
  getW(index: number): number {
    return this.#array[index * this.#stride + 3];
  }
}
