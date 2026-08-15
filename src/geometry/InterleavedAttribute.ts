import type { Matrix3 } from "../math/Matrix3.ts";
import type { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { denormalize, normalize } from "./_attributeHelpers.ts";
import { Attribute, type AttributeArray } from "./Attribute.ts";
import type { InterleavedData } from "./InterleavedData.ts";

const _vector = new Vector3();

/** Strided view of one vertex channel inside interleaved data. */
export class InterleavedAttribute {
  readonly #data: InterleavedData;
  readonly #itemSize: number;
  readonly #offset: number;
  readonly #normalized: boolean;

  /** Optional channel name included in serialized output. */
  name = "";

  /** This object is an InterleavedAttribute. */
  readonly isInterleavedAttribute = true;

  /** Constructs a strided channel view over packed vertex data. */
  constructor(
    data: InterleavedData,
    itemSize: number,
    offset: number,
    normalized = false,
  ) {
    if (!Number.isInteger(itemSize) || itemSize <= 0) {
      throw new RangeError(
        "InterleavedAttribute: itemSize must be a positive integer",
      );
    }
    if (
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset + itemSize > data.stride
    ) {
      throw new RangeError(
        "InterleavedAttribute: offset and itemSize must fit within the stride",
      );
    }
    this.#data = data;
    this.#itemSize = itemSize;
    this.#offset = offset;
    this.#normalized = normalized;
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

  /** Whether integer storage is exposed as normalized floating-point values. */
  get normalized(): boolean {
    return this.#normalized;
  }

  /** Whether the latest channel writes have been published to packed storage. */
  get needsUpdate(): boolean {
    return this.#data.needsUpdate;
  }

  /** Publishes the packed storage mutation to its consumers. */
  set needsUpdate(value: boolean) {
    this.#data.needsUpdate = value;
  }

  /** Number of interleaved vertex records visible through this channel. */
  get count(): number {
    return this.#data.count;
  }

  /** Underlying typed-array storage for the channel. */
  get array(): AttributeArray {
    return this.#data.array;
  }

  /** Applies a 4x4 transform to each xyz channel record. */
  applyMatrix4(matrix: Matrix4): this {
    for (let index = 0; index < this.count; index++) {
      _vector
        .set(this.getX(index), this.getY(index), this.getZ(index))
        .applyMatrix4(matrix);
      this.setXYZ(index, _vector.x, _vector.y, _vector.z);
    }
    return this;
  }

  /** Applies and renormalizes a normal-matrix transform to each xyz record. */
  applyNormalMatrix(matrix: Matrix3): this {
    for (let index = 0; index < this.count; index++) {
      _vector
        .set(this.getX(index), this.getY(index), this.getZ(index))
        .applyNormalMatrix(matrix);
      this.setXYZ(index, _vector.x, _vector.y, _vector.z);
    }
    return this;
  }

  /** Transforms each xyz record as a direction and renormalizes it. */
  transformDirection(matrix: Matrix4): this {
    for (let index = 0; index < this.count; index++) {
      _vector
        .set(this.getX(index), this.getY(index), this.getZ(index))
        .transformDirection(matrix);
      this.setXYZ(index, _vector.x, _vector.y, _vector.z);
    }
    return this;
  }

  /** Reads one component from a vertex record. */
  getComponent(index: number, component: number): number {
    return this.#read(index, component);
  }

  /** Writes one component and returns this channel. */
  setComponent(index: number, component: number, value: number): this {
    this.#write(index, component, value);
    return this;
  }

  /** Reads the x component at a vertex index. */
  getX(index: number): number {
    return this.#read(index, 0);
  }

  /** Reads the y component at a vertex index. */
  getY(index: number): number {
    return this.#read(index, 1);
  }

  /** Reads the z component at a vertex index. */
  getZ(index: number): number {
    return this.#read(index, 2);
  }

  /** Reads the w component at a vertex index. */
  getW(index: number): number {
    return this.#read(index, 3);
  }

  /** Writes the x component at a vertex index. */
  setX(index: number, x: number): this {
    return this.setComponent(index, 0, x);
  }

  /** Writes the y component at a vertex index. */
  setY(index: number, y: number): this {
    return this.setComponent(index, 1, y);
  }

  /** Writes the z component at a vertex index. */
  setZ(index: number, z: number): this {
    return this.setComponent(index, 2, z);
  }

  /** Writes the w component at a vertex index. */
  setW(index: number, w: number): this {
    return this.setComponent(index, 3, w);
  }

  /** Writes an xy pair at a vertex index. */
  setXY(index: number, x: number, y: number): this {
    const offset = this.#validateRange(index, 2);
    this.#writeScalar(offset, x);
    this.#writeScalar(offset + 1, y);
    return this;
  }

  /** Writes an xyz triple at a vertex index. */
  setXYZ(index: number, x: number, y: number, z: number): this {
    const offset = this.#validateRange(index, 3);
    this.#writeScalar(offset, x);
    this.#writeScalar(offset + 1, y);
    this.#writeScalar(offset + 2, z);
    return this;
  }

  /** Writes an xyzw tuple at a vertex index. */
  setXYZW(index: number, x: number, y: number, z: number, w: number): this;
  /** Writes four scalar components into an interleaved vertex record. */
  setXYZW(index: number, ...values: [number, number, number, number]): this {
    const [x, y, z, w] = values;
    const offset = this.#validateRange(index, 4);
    this.#writeScalar(offset, x);
    this.#writeScalar(offset + 1, y);
    this.#writeScalar(offset + 2, z);
    this.#writeScalar(offset + 3, w);
    return this;
  }

  /** Returns a de-interleaved copy with cloned mutable state. */
  clone(): Attribute {
    const values: number[] = [];
    for (let index = 0; index < this.count; index++) {
      for (let component = 0; component < this.#itemSize; component++) {
        values.push(
          this.#data.array[
            index * this.#data.stride + this.#offset + component
          ],
        );
      }
    }
    const array = new (
      this.array.constructor as new (
        values: ArrayLike<number>,
      ) => AttributeArray
    )(values);
    const clone = new Attribute(array, this.#itemSize, this.#normalized);
    clone.name = this.name;
    clone.needsUpdate = this.needsUpdate;
    return clone;
  }

  /** Serializes this channel as a de-interleaved CPU attribute. */
  toJSON(): ReturnType<Attribute["toJSON"]> {
    return this.clone().toJSON();
  }

  #read(index: number, component: number): number {
    return this.#readScalar(this.#validateComponent(index, component));
  }

  #write(index: number, component: number, value: number): void {
    this.#writeScalar(this.#validateComponent(index, component), value);
  }

  #readScalar(index: number): number {
    const value = this.#data.array[index];
    return this.#normalized ? denormalize(value, this.#data.array) : value;
  }

  #writeScalar(index: number, value: number): void {
    this.#data.array[index] = this.#normalized
      ? normalize(value, this.#data.array)
      : value;
  }

  #validateComponent(index: number, component: number): number {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.#data.count ||
      !Number.isInteger(component) ||
      component < 0 ||
      component >= this.#itemSize
    ) {
      throw new RangeError(
        "InterleavedAttribute: record or component index is outside the attribute",
      );
    }
    return index * this.#data.stride + this.#offset + component;
  }

  #validateRange(index: number, size: number): number {
    if (size > this.#itemSize) {
      throw new RangeError("InterleavedAttribute: tuple size exceeds itemSize");
    }
    this.#validateComponent(index, size - 1);
    return index * this.#data.stride + this.#offset;
  }
}
