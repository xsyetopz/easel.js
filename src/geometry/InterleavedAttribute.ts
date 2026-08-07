import type { InterleavedData } from "./InterleavedData.ts";

/** Strided view of one vertex channel inside interleaved data. */
export class InterleavedAttribute {
  #data: InterleavedData;
  #itemSize: number;
  #offset: number;
  /** Whether consumers must publish the modified packed storage. */
  needsUpdate: boolean = false;

  /** Constructs a strided channel view over packed vertex data. */
  constructor(data: InterleavedData, itemSize: number, offset: number) {
    this.#data = data;
    this.#itemSize = itemSize;
    this.#offset = offset;
  }

  /** Interleaved data that owns this channel view. */
  get data(): InterleavedData {
    return this.#data;
  }

  /** Number of scalar components stored for each vertex. */
  get itemSize(): number {
    return this.#itemSize;
  }

  /** Scalar offset of the channel within each interleaved record. */
  get offset(): number {
    return this.#offset;
  }

  /** Number of interleaved vertex records visible through this channel. */
  get count(): number {
    return this.#data.count;
  }

  /** Underlying typed-array storage for the channel. */
  get array(): Float32Array | Int32Array | Uint32Array | Uint16Array {
    return this.#data.array;
  }

  /** Reads the x component at a vertex index. */
  getX(index: number): number {
    return this.#data.array[index * this.#data.stride + this.#offset];
  }

  /** Reads the y component at a vertex index. */
  getY(index: number): number {
    return this.#data.array[index * this.#data.stride + this.#offset + 1];
  }

  /** Reads the z component at a vertex index. */
  getZ(index: number): number {
    return this.#data.array[index * this.#data.stride + this.#offset + 2];
  }

  /** Reads the w component at a vertex index. */
  getW(index: number): number {
    return this.#data.array[index * this.#data.stride + this.#offset + 3];
  }

  /** Writes the x component at a vertex index. */
  setX(index: number, x: number): this {
    this.#data.array[index * this.#data.stride + this.#offset] = x;
    return this;
  }

  /** Writes the y component at a vertex index. */
  setY(index: number, y: number): this {
    this.#data.array[index * this.#data.stride + this.#offset + 1] = y;
    return this;
  }

  /** Writes the z component at a vertex index. */
  setZ(index: number, z: number): this {
    this.#data.array[index * this.#data.stride + this.#offset + 2] = z;
    return this;
  }

  /** Writes the w component at a vertex index. */
  setW(index: number, w: number): this {
    this.#data.array[index * this.#data.stride + this.#offset + 3] = w;
    return this;
  }
}
