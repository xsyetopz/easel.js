import type { AttributeArray } from "./Attribute.ts";

/** Packed typed-array storage for multiple strided vertex channels. */
export class InterleavedData {
  #array: AttributeArray;
  #stride: number;

  /** Whether consumers must publish the modified packed storage. */
  needsUpdate = false;

  /** Range of scalar records changed since the previous upload. */
  updateRange: { offset: number; count: number } = { offset: 0, count: -1 };

  /** Unique identifier for the data instance. */
  readonly uuid: string = globalThis.crypto.randomUUID();

  /** Whether this object is an InterleavedData. */
  readonly isInterleavedData = true;

  /** Constructs packed typed-array storage with a fixed scalar stride. */
  constructor(array: AttributeArray, stride: number) {
    if (!Number.isInteger(stride) || stride <= 0) {
      throw new RangeError(
        "InterleavedData: stride must be a finite positive integer",
      );
    }
    if (array.length % stride !== 0) {
      throw new RangeError(
        "InterleavedData: array length must be divisible by stride",
      );
    }
    this.#array = array;
    this.#stride = stride;
  }

  /** Underlying typed-array storage for the channel. */
  get array(): AttributeArray {
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
    const clone = new InterleavedData(
      this.#array.slice() as AttributeArray,
      this.#stride,
    );
    clone.#copyMetadata(this);
    return clone;
  }

  /** Copies mutable state from another instance. */
  copy(source: InterleavedData): this {
    this.#array = source.array.slice() as AttributeArray;
    this.#stride = source.stride;
    return this.#copyMetadata(source);
  }

  /** Copies scalar values into the underlying storage at `offset`. */
  set(value: ArrayLike<number>, offset = 0): this {
    this.#array.set(value, offset);
    return this;
  }

  /** Reads the x component at a vertex index. */
  getX(index: number): number {
    return this.#array[this.#scalarIndex(index, 0)];
  }

  /** Reads the y component at a vertex index. */
  getY(index: number): number {
    return this.#array[this.#scalarIndex(index, 1)];
  }

  /** Reads the z component at a vertex index. */
  getZ(index: number): number {
    return this.#array[this.#scalarIndex(index, 2)];
  }

  /** Reads the w component at a vertex index. */
  getW(index: number): number {
    return this.#array[this.#scalarIndex(index, 3)];
  }

  /** Copies a single interleaved record from another data instance at the given offset. */
  copyAt(index: number, attribute: InterleavedData, offset: number): this {
    const destination = this.#recordStart(index);
    const source = attribute.#recordStart(offset);
    if (attribute.stride < this.#stride) {
      throw new RangeError(
        "InterleavedData: source stride cannot hold the destination record",
      );
    }
    const values = attribute.array.slice(source, source + this.#stride);
    this.#array.set(values, destination);
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

  #copyMetadata(source: InterleavedData): this {
    this.needsUpdate = source.needsUpdate;
    this.updateRange = { ...source.updateRange };
    return this;
  }

  #recordStart(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) {
      throw new RangeError("InterleavedData: record index is outside the data");
    }
    return index * this.#stride;
  }

  #scalarIndex(index: number, component: number): number {
    const start = this.#recordStart(index);
    if (component < 0 || component >= this.#stride) {
      throw new RangeError(
        "InterleavedData: component index is outside the record",
      );
    }
    return start + component;
  }
}
