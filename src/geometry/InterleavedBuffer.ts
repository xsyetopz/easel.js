type TypedArray = Float32Array | Int32Array | Uint32Array | Uint16Array;

/** Packed typed-array storage for multiple strided vertex channels. */
export class InterleavedBuffer {
  #array: TypedArray;
  #stride: number;

  /** Whether consumers must publish the modified packed storage. */
  needsUpdate: boolean = false;

  /** Range of scalar records changed since the previous upload. */
  updateRange: { offset: number; count: number } = { offset: 0, count: -1 };

  /** Unique identifier for the buffer instance. */
  readonly uuid: string = globalThis.crypto.randomUUID();

  /** Revision counter bumped on each data mutation. */
  version: number = 0;

  /** WebGL usage hint mirrored from three.js for API parity. */
  usage: number = 35044;

  /** Ranges describing partial updates since the last upload. */
  updateRanges: Array<{ start: number; count: number }> = [];

  /** Whether this object is an InterleavedBuffer. */
  readonly isInterleavedBuffer = true;

  /** Optional callback invoked after the buffer is uploaded to the GPU. */
  onUploadCallback: (() => void) | undefined = undefined;

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
    this.version = source.version;
    this.usage = source.usage;
    this.updateRanges = source.updateRanges.map((range) => ({ ...range }));
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

  /** Copies a single interleaved record from another buffer at the given offset. */
  copyAt(index: number, attribute: InterleavedBuffer, offset: number): this {
    for (let i = 0; i < this.#stride; i++) {
      this.#array[index * this.#stride + i] =
        attribute.array[offset * attribute.stride + i];
    }
    return this;
  }

  /** Sets the WebGL usage hint for this buffer. */
  setUsage(value: number): this {
    this.usage = value;
    return this;
  }

  /** Appends a partial-update range for the next upload. */
  addUpdateRange(start: number, count: number): void {
    this.updateRanges.push({ start, count });
  }

  /** Clears all pending partial-update ranges. */
  clearUpdateRanges(): void {
    this.updateRanges = [];
  }

  /** Registers a callback invoked after the buffer is uploaded to the GPU. */
  onUpload(callback: () => void): this {
    this.onUploadCallback = callback;
    return this;
  }

  /** Serializes the buffer to a plain object. */
  toJSON(): { array: number[]; stride: number; type: string } {
    return {
      array: Array.from(this.#array),
      stride: this.#stride,
      type: this.#array.constructor.name,
    };
  }
}
