import type { Matrix3 } from "../math/Matrix3.ts";
import type { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
  denormalize,
  normalize,
  publishAttributeUpdate,
} from "./_attributeHelpers.ts";

export {
  registerAttributeUpdateInvalidator,
  toNormalizedTypeName,
  toType,
  unregisterAttributeUpdateInvalidator,
} from "./_attributeHelpers.ts";

/** Typed-array storage accepted by an `Attribute`. */
export type AttributeArray =
  | Float32Array
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array;

const _vector = new Vector3();

/** Typed-array-backed vertex channel with optional normalized integer access. */
export class Attribute {
  #array: AttributeArray;
  #itemSize: number;
  #normalized: boolean;
  #needsUpdate = false;

  /** Optional channel name included in serialized output. */
  name: string = "";
  /** Whether the latest channel writes have been published to geometry cache owners. */
  get needsUpdate(): boolean {
    return this.#needsUpdate;
  }

  /** Setting `true` publishes the channel mutation to registered geometry cache owners. */
  set needsUpdate(value: boolean) {
    this.#needsUpdate = value;
    if (value) publishAttributeUpdate(this);
  }

  /** Constructs a channel from packed scalar values. */
  constructor(
    array: AttributeArray | number[],
    itemSize: number,
    normalized: boolean = false,
  ) {
    if (!Number.isInteger(itemSize) || itemSize <= 0) {
      throw new RangeError("Attribute: itemSize must be a positive integer");
    }
    if (array.length % itemSize !== 0) {
      throw new RangeError(
        "Attribute: array length must be divisible by itemSize",
      );
    }
    this.#array = Array.isArray(array) ? new Float32Array(array) : array;
    this.#itemSize = itemSize;
    this.#normalized = normalized;
  }

  /** Underlying typed-array storage for the channel. */
  get array(): AttributeArray {
    return this.#array;
  }

  /** Number of scalar components stored for each vertex. */
  get itemSize(): number {
    return this.#itemSize;
  }

  /** Whether integer storage is exposed as normalized floating-point values. */
  get normalized(): boolean {
    return this.#normalized;
  }

  /** Number of vertex records represented by this channel. */
  get count(): number {
    return this.#array.length / this.#itemSize;
  }

  /** Reads one component from a vertex record. */
  getComponent(index: number, component: number): number {
    return this.#read(index * this.#itemSize + component);
  }

  /** Writes one component and returns this channel. */
  setComponent(index: number, component: number, value: number): this {
    this.#write(index * this.#itemSize + component, value);
    return this;
  }

  /** Reads the x component at a vertex index. */
  getX(index: number): number {
    return this.#read(index * this.#itemSize);
  }

  /** Reads the y component at a vertex index. */
  getY(index: number): number {
    return this.#read(index * this.#itemSize + 1);
  }

  /** Reads the z component at a vertex index. */
  getZ(index: number): number {
    return this.#read(index * this.#itemSize + 2);
  }

  /** Reads the w component at a vertex index. */
  getW(index: number): number {
    return this.#read(index * this.#itemSize + 3);
  }

  /** Writes the x component at a vertex index. */
  setX(index: number, x: number): this {
    this.#write(index * this.#itemSize, x);
    return this;
  }

  /** Writes the y component at a vertex index. */
  setY(index: number, y: number): this {
    this.#write(index * this.#itemSize + 1, y);
    return this;
  }

  /** Writes the z component at a vertex index. */
  setZ(index: number, z: number): this {
    this.#write(index * this.#itemSize + 2, z);
    return this;
  }

  /** Writes the w component at a vertex index. */
  setW(index: number, w: number): this {
    this.#write(index * this.#itemSize + 3, w);
    return this;
  }

  /** Writes an xy pair at a vertex index. */
  setXY(index: number, x: number, y: number): this {
    const offset = index * this.#itemSize;
    this.#write(offset, x);
    this.#write(offset + 1, y);
    return this;
  }

  /** Writes an xyz triple at a vertex index. */
  setXYZ(index: number, x: number, y: number, z: number): this {
    const offset = index * this.#itemSize;
    this.#write(offset, x);
    this.#write(offset + 1, y);
    this.#write(offset + 2, z);
    return this;
  }

  /** Writes an xyzw tuple at a vertex index. */
  setXYZW(index: number, x: number, y: number, z: number, w: number): this {
    const offset = index * this.#itemSize;
    this.#write(offset, x);
    this.#write(offset + 1, y);
    this.#write(offset + 2, z);
    this.#write(offset + 3, w);
    return this;
  }

  /** Copies scalar values into the underlying storage at `offset`. */
  set(values: ArrayLike<number>, offset: number = 0): this {
    this.#array.set(values, offset);
    return this;
  }

  /** Copies values from `values` into the underlying storage. */
  copyArray(values: ArrayLike<number>): this {
    this.#array.set(values);
    return this;
  }

  /** Copies one vertex record from another attribute. */
  copyAt(
    destinationIndex: number,
    source: Attribute,
    sourceIndex: number,
  ): this {
    for (let component = 0; component < this.#itemSize; component++) {
      this.setComponent(
        destinationIndex,
        component,
        source.getComponent(sourceIndex, component),
      );
    }
    return this;
  }

  /** Applies a 3x3 transform to each channel record. */
  applyMatrix3(matrix: Matrix3): this {
    for (let index = 0; index < this.count; index++) {
      _vector
        .set(this.getX(index), this.getY(index), this.getZ(index))
        .applyMatrix3(matrix);
      this.setXYZ(index, _vector.x, _vector.y, _vector.z);
    }
    return this;
  }

  /** Applies a 4x4 transform to each channel record. */
  applyMatrix4(matrix: Matrix4): this {
    for (let index = 0; index < this.count; index++) {
      _vector
        .set(this.getX(index), this.getY(index), this.getZ(index))
        .applyMatrix4(matrix);
      this.setXYZ(index, _vector.x, _vector.y, _vector.z);
    }
    return this;
  }

  /** Applies and renormalizes a normal-matrix transform for each record. */
  applyNormalMatrix(matrix: Matrix3): this {
    for (let index = 0; index < this.count; index++) {
      _vector
        .set(this.getX(index), this.getY(index), this.getZ(index))
        .applyMatrix3(matrix)
        .normalize();
      this.setXYZ(index, _vector.x, _vector.y, _vector.z);
    }
    return this;
  }

  /** Transforms each xyz record as a direction and renormalizes it. */
  transformDirection(matrix: Matrix4): this {
    const elements = matrix.elements;
    for (let index = 0; index < this.count; index++) {
      const x = this.getX(index);
      const y = this.getY(index);
      const z = this.getZ(index);
      _vector
        .set(
          elements[0] * x + elements[4] * y + elements[8] * z,
          elements[1] * x + elements[5] * y + elements[9] * z,
          elements[2] * x + elements[6] * y + elements[10] * z,
        )
        .normalize();
      this.setXYZ(index, _vector.x, _vector.y, _vector.z);
    }
    return this;
  }

  /** Returns an independent copy with cloned mutable state. */
  clone(): Attribute {
    return new Attribute(
      this.#array.slice() as AttributeArray,
      this.#itemSize,
      this.#normalized,
    ).#copyMetadata(this);
  }

  /** Copies mutable state from another instance. */
  copy(source: Attribute): this {
    this.#array = source.array.slice() as AttributeArray;
    this.#itemSize = source.itemSize;
    this.#normalized = source.normalized;
    return this.#copyMetadata(source);
  }

  /** Serializes channel metadata and scalar values. */
  toJSON(): {
    itemSize: number;
    type: string;
    array: number[];
    normalized: boolean;
    name?: string;
  } {
    return {
      itemSize: this.#itemSize,
      type: this.#array.constructor.name,
      array: Array.from(this.#array),
      normalized: this.#normalized,
      ...(this.name ? { name: this.name } : {}),
    };
  }

  #copyMetadata(source: Attribute): this {
    this.name = source.name;
    this.needsUpdate = source.needsUpdate;
    return this;
  }

  #read(index: number): number {
    const value = this.#array[index];
    return this.#normalized ? denormalize(value, this.#array) : value;
  }

  #write(index: number, value: number): void {
    this.#array[index] = this.#normalized
      ? normalize(value, this.#array)
      : value;
  }
}
