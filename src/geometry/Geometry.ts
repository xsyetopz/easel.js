import { Box3 } from "../math/Box3.ts";
import { Matrix3 } from "../math/Matrix3.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import type { Quaternion } from "../math/Quaternion.ts";
import { Sphere } from "../math/Sphere.ts";
import { Vector3 } from "../math/Vector3.ts";
import type { AttributeArray } from "./Attribute.ts";
import {
  Attribute,
  registerAttributeUpdateInvalidator,
  unregisterAttributeUpdateInvalidator,
} from "./Attribute.ts";

let _geometryId = 0;

const _point = new Vector3();
const _offset = new Vector3();
const _matrix = new Matrix4();
const _normalMatrix = new Matrix3();

type GeometryCacheInvalidator = () => void;

const _cacheInvalidators = new WeakMap<
  Geometry,
  Set<WeakRef<GeometryCacheInvalidator>>
>();

/** Registers a callback that runs when this geometry invalidates derived caches. */
export function registerGeometryCacheInvalidator(
  geometry: Geometry,
  invalidator: GeometryCacheInvalidator,
): void {
  let invalidators = _cacheInvalidators.get(geometry);
  if (!invalidators) {
    invalidators = new Set();
    _cacheInvalidators.set(geometry, invalidators);
  }
  for (const reference of invalidators) {
    if (reference.deref() === invalidator) return;
  }
  invalidators.add(new WeakRef(invalidator));
}

/** Removes a previously registered geometry cache invalidation callback. */
export function unregisterGeometryCacheInvalidator(
  geometry: Geometry,
  invalidator: GeometryCacheInvalidator,
): void {
  const invalidators = _cacheInvalidators.get(geometry);
  if (!invalidators) return;
  for (const reference of invalidators) {
    const current = reference.deref();
    if (!current || current === invalidator) invalidators.delete(reference);
  }
  if (invalidators.size === 0) _cacheInvalidators.delete(geometry);
}

function invalidateGeometryCaches(geometry: Geometry): void {
  const invalidators = _cacheInvalidators.get(geometry);
  if (!invalidators) return;
  for (const reference of invalidators) {
    const invalidator = reference.deref();
    if (invalidator) invalidator();
    else invalidators.delete(reference);
  }
  if (invalidators.size === 0) _cacheInvalidators.delete(geometry);
}

type TypedArrayConstructor = new (length: number) => AttributeArray;

/** CPU vertex-data container for positions, normals, UVs, colors, and indices. */
export class Geometry {
  /** Stable numeric identifier assigned when the geometry is constructed. */
  readonly id: number = _geometryId++;
  /** Optional channel name included in serialized output. */
  name: string = "";
  /** Serialization discriminator for this runtime type. */
  type: string = "Geometry";
  /** Primitive-construction parameters retained for serialization. */
  parameters: Record<string, unknown> = {};
  readonly #attributes = new Map<string, Attribute>();
  #index: Uint16Array | Uint32Array | undefined = undefined;
  #publishingInternalAttributeUpdate = false;
  readonly #invalidateAttributeCaches = (): void => {
    if (this.#publishingInternalAttributeUpdate) return;
    this.boundingBox = undefined;
    this.boundingSphere = undefined;
    this.#clearUvCache();
    invalidateGeometryCaches(this);
  };
  /** Cached local-space axis-aligned bounds, or `undefined` until computed. */
  boundingBox: Box3 | undefined = undefined;
  /** Cached local-space bounding sphere, or `undefined` until computed. */
  boundingSphere: Sphere | undefined = undefined;

  /** Replaces the position channel from packed xyz values. */
  setPositions(array: Float32Array | number[]): this {
    const data =
      array instanceof Float32Array ? array : new Float32Array(array);
    this.#replaceAttribute("position", new Attribute(data, 3));
    this.#invalidateDerivedData(true, false);
    return this;
  }

  /** Replaces the UV channel from packed coordinate pairs. */
  setUVs(array: Float32Array | number[]): this {
    const data =
      array instanceof Float32Array ? array : new Float32Array(array);
    this.#replaceAttribute("uv", new Attribute(data, 2));
    this.#invalidateDerivedData(false, true);
    return this;
  }

  /** Replaces the per-vertex RGB color channel used by baked shading. */
  setColors(array: Float32Array | number[]): this {
    const data =
      array instanceof Float32Array ? array : new Float32Array(array);
    this.#replaceAttribute("color", new Attribute(data, 3));
    return this;
  }

  /** Replaces the normal channel from packed xyz vectors. */
  setNormals(array: Float32Array | number[]): this {
    const data =
      array instanceof Float32Array ? array : new Float32Array(array);
    this.#replaceAttribute("normal", new Attribute(data, 3));
    invalidateGeometryCaches(this);
    return this;
  }

  /** Assigns or clears the triangle index buffer. */
  set index(array: Uint16Array | Uint32Array | number[] | undefined) {
    this.#clearSequentialIndices();
    if (array === undefined) {
      this.#index = undefined;
      return;
    }
    if (array instanceof Uint16Array || array instanceof Uint32Array) {
      this.#index = array;
    } else {
      this.#index =
        array.length > 65535 ? new Uint32Array(array) : new Uint16Array(array);
    }
  }

  /** Returns the named vertex channel, if present. */
  getAttribute(name: string): Attribute | undefined {
    return this.#attributes.get(name);
  }

  /** Installs or replaces a named vertex channel. */
  setAttribute(name: string, attribute: Attribute): this {
    this.#replaceAttribute(name, attribute);
    this.#invalidateDerivedData(name === "position", name === "uv");
    if (name === "normal") invalidateGeometryCaches(this);
    return this;
  }

  /** Removes a named vertex channel and invalidates dependent caches. */
  deleteAttribute(name: string): boolean {
    const attribute = this.#attributes.get(name);
    const deleted = this.#attributes.delete(name);
    if (deleted && attribute) {
      unregisterAttributeUpdateInvalidator(
        attribute,
        this.#invalidateAttributeCaches,
      );
      this.#invalidateDerivedData(name === "position", name === "uv");
      if (name === "normal") invalidateGeometryCaches(this);
    }
    return deleted;
  }

  /** Optional triangle index buffer; `undefined` selects sequential vertices. */
  get index(): Uint16Array | Uint32Array | undefined {
    return this.#index;
  }

  /** Read-only view of the named vertex channels. */
  get attributes(): ReadonlyMap<string, Attribute> {
    return this.#attributes;
  }

  /** Computes per-face normals and writes them to the normal channel. */
  computeVertexNormals(): this {
    const posAttr = this.#attributes.get("position");
    if (!posAttr) return this;

    const positions = posAttr.array;
    const normals = new Float32Array(positions.length);
    const index = this.#index;

    const pA = new Vector3();
    const pB = new Vector3();
    const pC = new Vector3();
    const cb = new Vector3();
    const ab = new Vector3();

    if (index) {
      for (let i = 0; i < index.length; i += 3) {
        const a = index[i] * 3;
        const b = index[i + 1] * 3;
        const c = index[i + 2] * 3;

        pA.set(positions[a], positions[a + 1], positions[a + 2]);
        pB.set(positions[b], positions[b + 1], positions[b + 2]);
        pC.set(positions[c], positions[c + 1], positions[c + 2]);

        cb.copy(pC).sub(pB);
        ab.copy(pA).sub(pB);
        cb.cross(ab);

        normals[a] += cb.x;
        normals[a + 1] += cb.y;
        normals[a + 2] += cb.z;
        normals[b] += cb.x;
        normals[b + 1] += cb.y;
        normals[b + 2] += cb.z;
        normals[c] += cb.x;
        normals[c + 1] += cb.y;
        normals[c + 2] += cb.z;
      }
    } else {
      for (let i = 0; i < positions.length; i += 9) {
        pA.set(positions[i], positions[i + 1], positions[i + 2]);
        pB.set(positions[i + 3], positions[i + 4], positions[i + 5]);
        pC.set(positions[i + 6], positions[i + 7], positions[i + 8]);

        cb.copy(pC).sub(pB);
        ab.copy(pA).sub(pB);
        cb.cross(ab);

        normals[i] = cb.x;
        normals[i + 1] = cb.y;
        normals[i + 2] = cb.z;
        normals[i + 3] = cb.x;
        normals[i + 4] = cb.y;
        normals[i + 5] = cb.z;
        normals[i + 6] = cb.x;
        normals[i + 7] = cb.y;
        normals[i + 8] = cb.z;
      }
    }

    // normalize
    const nv = new Vector3();
    for (let i = 0; i < normals.length; i += 3) {
      nv.set(normals[i], normals[i + 1], normals[i + 2]).normalize();
      normals[i] = nv.x;
      normals[i + 1] = nv.y;
      normals[i + 2] = nv.z;
    }

    const normal = new Attribute(normals, 3);
    this.#publishInternalUpdate(normal);
    this.#replaceAttribute("normal", normal);
    invalidateGeometryCaches(this);
    return this;
  }

  /** Computes an axis-aligned bounding box from the position attribute. */
  computeBoundingBox(): this {
    const box = this.boundingBox ?? new Box3();
    const position = this.#attributes.get("position");
    box.makeEmpty();

    if (position) {
      const itemSize = position.itemSize;
      for (let index = 0; index < position.count; index++) {
        _point.set(
          itemSize > 0 ? position.getComponent(index, 0) : 0,
          itemSize > 1 ? position.getComponent(index, 1) : 0,
          itemSize > 2 ? position.getComponent(index, 2) : 0,
        );
        box.expandByPoint(_point);
      }
    }

    this.boundingBox = box;
    return this;
  }

  /** Translates all position vertices and prepared bounds in place. */
  translate(x: number, y: number, z: number): this {
    const position = this.#attributes.get("position");
    if (position && position.itemSize >= 3) {
      for (let index = 0; index < position.count; index++) {
        position.setXYZ(
          index,
          position.getX(index) + x,
          position.getY(index) + y,
          position.getZ(index) + z,
        );
      }
      this.#publishInternalUpdate(position);
    }

    _offset.set(x, y, z);
    this.boundingBox?.translate(_offset);
    this.boundingSphere?.translate(_offset);
    return this;
  }

  /** Centers position vertices around the origin using the prepared bounds. */
  center(): this {
    if (!this.boundingBox) this.computeBoundingBox();
    const box = this.boundingBox;
    if (!box || box.isEmpty) return this;

    box.getCenter(_point);
    return this.translate(-_point.x, -_point.y, -_point.z);
  }

  /** Applies a transform once and invalidates only meshes sharing this geometry. */
  applyMatrix4(matrix: Matrix4): this {
    const normal = this.#attributes.get("normal");
    if (normal) _normalMatrix.getNormalMatrix(matrix);

    const position = this.#attributes.get("position");
    if (position) {
      position.applyMatrix4(matrix);
      this.#publishInternalUpdate(position);
    }

    if (normal) {
      normal.applyNormalMatrix(_normalMatrix);
      this.#publishInternalUpdate(normal);
      invalidateGeometryCaches(this);
    }

    this.boundingBox?.applyMatrix4(matrix);
    this.boundingSphere?.applyMatrix4(matrix);
    return this;
  }

  /** Rotates all position and normal channels by a quaternion. */
  applyQuaternion(quaternion: Quaternion): this {
    _matrix.makeRotationFromQuaternion(quaternion);
    return this.applyMatrix4(_matrix);
  }

  /** Rotates all position and normal channels around the x axis. */
  rotateX(angle: number): this {
    _matrix.makeRotationX(angle);
    return this.applyMatrix4(_matrix);
  }

  /** Rotates all position and normal channels around the y axis. */
  rotateY(angle: number): this {
    _matrix.makeRotationY(angle);
    return this.applyMatrix4(_matrix);
  }

  /** Rotates all position and normal channels around the z axis. */
  rotateZ(angle: number): this {
    _matrix.makeRotationZ(angle);
    return this.applyMatrix4(_matrix);
  }

  /** Scales all position and normal channels by the supplied factors. */
  scale(x: number, y: number, z: number): this {
    _matrix.makeScale(x, y, z);
    return this.applyMatrix4(_matrix);
  }

  /** Copies all geometry metadata, bounds, indices, and attributes. */
  copy(source: Geometry): this {
    if (source === this) return this;

    this.name = source.name;
    this.type = source.type;
    this.parameters = { ...source.parameters };
    this.#clearAttributes();
    for (const [name, attribute] of source.#attributes) {
      this.#replaceAttribute(name, attribute.clone());
    }
    this.#index = source.#index?.slice() as
      | Uint16Array
      | Uint32Array
      | undefined;
    this.boundingBox = source.boundingBox?.clone();
    this.boundingSphere = source.boundingSphere?.clone();
    this.#clearSequentialIndices();
    this.#clearUvCache();
    invalidateGeometryCaches(this);
    return this;
  }

  /** Returns a deep copy with a fresh geometry id. */
  clone(): Geometry {
    return new Geometry().copy(this);
  }

  /** Expands indexed attributes into a sequential, non-indexed geometry. */
  toNonIndexed(): Geometry {
    const index = this.#index;
    if (!index) return this.clone();

    const result = new Geometry();
    result.name = this.name;
    result.type = this.type;
    result.parameters = { ...this.parameters };

    for (const [name, attribute] of this.#attributes) {
      const array = new (attribute.array.constructor as TypedArrayConstructor)(
        index.length * attribute.itemSize,
      );
      const expanded = new Attribute(
        array,
        attribute.itemSize,
        attribute.normalized,
      );
      expanded.name = attribute.name;
      expanded.needsUpdate = attribute.needsUpdate;
      for (let item = 0; item < index.length; item++) {
        const sourceIndex = index[item];
        if (sourceIndex < 0 || sourceIndex >= attribute.count) {
          throw new RangeError(
            `Geometry.toNonIndexed(): index ${sourceIndex} exceeds ${name} attribute count`,
          );
        }
        expanded.copyAt(item, attribute, sourceIndex);
      }
      result.#replaceAttribute(name, expanded);
    }

    result.boundingBox = this.boundingBox?.clone();
    result.boundingSphere = this.boundingSphere?.clone();
    return result;
  }

  /** Computes a minimal bounding sphere from the position attribute. */
  computeBoundingSphere(): this {
    const posAttr = this.#attributes.get("position");
    if (!posAttr) return this;
    const arr = posAttr.array;
    const itemSize = posAttr.itemSize;
    const count = arr.length / itemSize;
    if (count === 0) {
      this.boundingSphere = new Sphere(new Vector3(0, 0, 0), 0);
      return this;
    }

    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < count; i++) {
      cx += arr[i * itemSize];
      cy += arr[i * itemSize + 1];
      cz += arr[i * itemSize + 2];
    }
    cx /= count;
    cy /= count;
    cz /= count;

    let maxRadiusSq = 0;
    for (let i = 0; i < count; i++) {
      const dx = arr[i * itemSize] - cx;
      const dy = arr[i * itemSize + 1] - cy;
      const dz = arr[i * itemSize + 2] - cz;
      maxRadiusSq = Math.max(maxRadiusSq, dx * dx + dy * dy + dz * dz);
    }

    this.boundingSphere = new Sphere(
      new Vector3(cx, cy, cz),
      Math.sqrt(maxRadiusSq),
    );
    return this;
  }

  /** Releases channel storage, indices, bounds, and derived caches. */
  dispose(): void {
    this.#clearAttributes();
    this.#index = undefined;
    this.boundingBox = undefined;
    this.boundingSphere = undefined;
    this.#clearSequentialIndices();
    this.#clearUvCache();
    invalidateGeometryCaches(this);
  }

  #invalidateDerivedData(positionChanged: boolean, uvChanged: boolean): void {
    if (positionChanged) {
      this.boundingBox = undefined;
      this.boundingSphere = undefined;
      this.#clearSequentialIndices();
    }
    if (uvChanged) this.#clearUvCache();
  }

  #clearSequentialIndices(): void {
    (
      this as unknown as {
        _sequentialIndices: Uint32Array | undefined;
      }
    )._sequentialIndices = undefined;
  }

  #clearUvCache(): void {
    (this as unknown as { _uvCache: Float32Array | undefined })._uvCache =
      undefined;
  }

  #replaceAttribute(name: string, attribute: Attribute): void {
    const previous = this.#attributes.get(name);
    if (previous === attribute) return;
    if (previous) {
      unregisterAttributeUpdateInvalidator(
        previous,
        this.#invalidateAttributeCaches,
      );
    }
    this.#attributes.set(name, attribute);
    registerAttributeUpdateInvalidator(
      attribute,
      this.#invalidateAttributeCaches,
    );
  }

  #clearAttributes(): void {
    for (const attribute of this.#attributes.values()) {
      unregisterAttributeUpdateInvalidator(
        attribute,
        this.#invalidateAttributeCaches,
      );
    }
    this.#attributes.clear();
  }

  #publishInternalUpdate(attribute: Attribute): void {
    this.#publishingInternalAttributeUpdate = true;
    try {
      attribute.needsUpdate = true;
    } finally {
      this.#publishingInternalAttributeUpdate = false;
    }
  }
}
