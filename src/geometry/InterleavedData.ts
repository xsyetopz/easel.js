type TypedArray = Float32Array | Int32Array | Uint32Array | Uint16Array;

/** Packed typed-array storage for multiple strided vertex channels. */
export class InterleavedData {
  #array: TypedArray;
  #stride: number;

  /** Whether consumers must publish the modified packed storage. */
  needsUpdate: boolean = false;

  /** Range of scalar records changed since the previous upload. */
  updateRange: { offset: number; count: number } = { offset: 0, count: -1 };

  /** Unique identifier for the data instance. */
  readonly uuid: string = globalThis.crypto.randomUUID();

  /** Whether this object is an InterleavedData. */
  readonly isInterleavedData = true;

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

  /** Number of interleaved vertex records represented by the data. */
  get count(): number {
    return this.#array.length / this.#stride;
  }

  /** Returns an independent copy with cloned mutable state. */
  clone(): InterleavedData {
    return new InterleavedData(this.#array.slice(), this.#stride);
  }

  /** Copies mutable state from another instance. */
  copy(source: InterleavedData): this {
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

  /** Copies a single interleaved record from another data instance at the given offset. */
  copyAt(index: number, attribute: InterleavedData, offset: number): this {
    for (let i = 0; i < this.#stride; i++) {
      this.#array[index * this.#stride + i] =
        attribute.array[offset * attribute.stride + i];
    }
    return this;
  }

  /** Serializes the data to a plain object. */
  toJSON(): { array: number[]; stride: number; type: string } {
    return {
      array: Array.from(this.#array),
      stride: this.#stride,
      type: this.#array.constructor.name,
    };
  }
}
