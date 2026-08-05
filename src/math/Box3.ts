import { fastMax, fastMin } from "./MathUtils.ts";
import type { Matrix4 } from "./Matrix4.ts";
import { Vector3 } from "./Vector3.ts";

interface BoundingSphereTarget {
  centre: Vector3;
  radius: number;
}

interface PlaneLike {
  normal: Vector3;
  constant: number;
}

interface TriangleLike {
  a: Vector3;
  b: Vector3;
  c: Vector3;
}

const _points = [
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
];
const _vector = new Vector3();
const _center = new Vector3();
const _extents = new Vector3();
const _v0 = new Vector3();
const _v1 = new Vector3();
const _v2 = new Vector3();
const _f0 = new Vector3();
const _f1 = new Vector3();
const _f2 = new Vector3();
const _triangleNormal = new Vector3();

function _satForAxis(
  axisX: number,
  axisY: number,
  axisZ: number,
  v0: Vector3,
  v1: Vector3,
  v2: Vector3,
  extents: Vector3,
): boolean {
  const radius =
    extents.x * Math.abs(axisX) +
    extents.y * Math.abs(axisY) +
    extents.z * Math.abs(axisZ);
  const p0 = v0.x * axisX + v0.y * axisY + v0.z * axisZ;
  const p1 = v1.x * axisX + v1.y * axisY + v1.z * axisZ;
  const p2 = v2.x * axisX + v2.y * axisY + v2.z * axisZ;
  const min = Math.min(p0, p1, p2);
  const max = Math.max(p0, p1, p2);
  return Math.max(-max, min) <= radius;
}

/** Minimal scene-node shape consumed by world-space bounds traversal. */
export interface SceneNode {
  /** Runtime class label used to identify mesh nodes. */
  type: string;
  /** World transform used to place this node and its geometry. */
  matrixWorld: Matrix4;
  /** Updates this node's world transform before bounds traversal. */
  updateMatrixWorld: (force: boolean, parentUpdated: boolean) => void;
  /** Optional geometry record containing a position attribute. */
  geometry?: {
    attributes?: {
      position?: { array: ArrayLike<number>; itemSize: number };
    };
  };
  /** Child nodes visited when computing aggregate bounds. */
  children: SceneNode[];
  /** Optional visibility flag used to skip this node during traversal. */
  visible?: boolean;
}

/** 3D axis-aligned bounding box. */
export class Box3 {
  /** Type marker identifying Box3 instances. */
  readonly isBox3 = true;

  #min: Vector3;
  #max: Vector3;

  /** Constructs an axis-aligned box from optional lower and upper corners. */
  constructor(min?: Vector3, max?: Vector3) {
    this.#min = min
      ? min.clone()
      : new Vector3(
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY,
        );
    this.#max = max
      ? max.clone()
      : new Vector3(
          Number.NEGATIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
        );
  }

  /** Lower corner of the box; the returned vector is live. */
  get min(): Vector3 {
    return this.#min;
  }

  /** Copies `value` into the box's lower corner. */
  set min(value: Vector3) {
    this.#min.copy(value);
  }

  /** Upper corner of the box; the returned vector is live. */
  get max(): Vector3 {
    return this.#max;
  }

  /** Copies `value` into the box's upper corner. */
  set max(value: Vector3) {
    this.#max.copy(value);
  }

  /** Box center computed from the lower and upper corners. */
  get centre(): Vector3 {
    return this.#min.clone().add(this.#max).multiplyScalar(0.5);
  }

  /** Box dimensions along the x, y, and z axes. */
  get size(): Vector3 {
    return this.#max.clone().sub(this.#min);
  }

  /** Box extent along the x axis. */
  get width(): number {
    return this.#max.x - this.#min.x;
  }

  /** Box extent along the y axis. */
  get height(): number {
    return this.#max.y - this.#min.y;
  }

  /** Box extent along the z axis. */
  get depth(): number {
    return this.#max.z - this.#min.z;
  }

  /** Newly allocated corner vectors in fixed box order. */
  get corners(): Vector3[] {
    const { x, y, z } = this.#min;
    const { x: x2, y: y2, z: z2 } = this.#max;

    return [
      new Vector3(x, y, z) /* 0: bottom-left-back */,
      new Vector3(x2, y, z) /* 1: bottom-right-back */,
      new Vector3(x, y2, z) /* 2: top-left-back */,
      new Vector3(x2, y2, z) /* 3: top-right-back */,
      new Vector3(x, y, z2) /* 4: bottom-left-front */,
      new Vector3(x2, y, z2) /* 5: bottom-right-front */,
      new Vector3(x, y2, z2) /* 6: top-left-front */,
      new Vector3(x2, y2, z2) /* 7: top-right-front */,
    ];
  }

  /** Whether the lower bounds exceed any corresponding upper bound. */
  get isEmpty(): boolean {
    return (
      this.#max.x < this.#min.x ||
      this.#max.y < this.#min.y ||
      this.#max.z < this.#min.z
    );
  }

  /** Returns a new instance with the same component values. */
  clone(): Box3 {
    return new Box3(this.#min.clone(), this.#max.clone());
  }

  /** Returns true when the argument box is fully enclosed. */
  containsBox(box: Box3): boolean {
    return (
      this.#min.x <= box.min.x &&
      this.#max.x >= box.max.x &&
      this.#min.y <= box.min.y &&
      this.#max.y >= box.max.y &&
      this.#min.z <= box.min.z &&
      this.#max.z >= box.max.z
    );
  }

  /** Returns true when `point` lies inside or on this box. */
  containsPoint(point: Vector3): boolean {
    return (
      point.x >= this.#min.x &&
      point.x <= this.#max.x &&
      point.y >= this.#min.y &&
      point.y <= this.#max.y &&
      point.z >= this.#min.z &&
      point.z <= this.#max.z
    );
  }

  /** Copies component values from the supplied instance into this one. */
  copy(box: Box3): this {
    this.#min.copy(box.min);
    this.#max.copy(box.max);
    return this;
  }

  /** Returns true when every stored component exactly matches the argument. */
  equals(box: Box3): boolean {
    return box.min.equals(this.#min) && box.max.equals(this.#max);
  }

  /** Copies the lower and upper corner values into this box. */
  set(min: Vector3, max: Vector3): this {
    this.#min.copy(min);
    this.#max.copy(max);
    return this;
  }

  /** Replaces the bounds from packed x/y/z positions in `values`. */
  setFromArray(values: ArrayLike<number>): this {
    this.makeEmpty();
    for (let i = 0; i + 2 < values.length; i += 3) {
      this.#min.x = fastMin(this.#min.x, values[i] as number);
      this.#min.y = fastMin(this.#min.y, values[i + 1] as number);
      this.#min.z = fastMin(this.#min.z, values[i + 2] as number);
      this.#max.x = fastMax(this.#max.x, values[i] as number);
      this.#max.y = fastMax(this.#max.y, values[i + 1] as number);
      this.#max.z = fastMax(this.#max.z, values[i + 2] as number);
    }
    return this;
  }

  /** Expands the bounds to include `point`. */
  expandByPoint(point: Vector3): this {
    const { x, y, z } = this.#min;
    const { x: x2, y: y2, z: z2 } = this.#max;
    const { x: px, y: py, z: pz } = point;

    this.#min.x = fastMin(x, px);
    this.#min.y = fastMin(y, py);
    this.#min.z = fastMin(z, pz);
    this.#max.x = fastMax(x2, px);
    this.#max.y = fastMax(y2, py);
    this.#max.z = fastMax(z2, pz);
    return this;
  }

  /** Expands every bound by `scalar` along all three axes. */
  expandByScalar(scalar: number): this {
    this.#min.x -= scalar;
    this.#min.y -= scalar;
    this.#min.z -= scalar;
    this.#max.x += scalar;
    this.#max.y += scalar;
    this.#max.z += scalar;
    return this;
  }

  /** Expands each bound by the corresponding component of `v`. */
  expandByVector3(v: Vector3): this {
    this.#min.sub(v);
    this.#max.add(v);
    return this;
  }

  /** Expands each bound in both directions by `v`. */
  expandByVector(v: Vector3): this {
    return this.expandByVector3(v);
  }

  /** Writes this box center into `out`. */
  getCentre(out: Vector3): Vector3 {
    return out.copy(this.#min).add(this.#max).multiplyScalar(0.5);
  }

  /** Writes this box's center into the caller-owned output vector. */
  getCenter(out: Vector3): Vector3 {
    return this.isEmpty
      ? out.set(0, 0, 0)
      : out.copy(this.#min).add(this.#max).multiplyScalar(0.5);
  }

  /** Writes this box's dimensions into the caller-owned output vector. */
  getSize(out: Vector3): Vector3 {
    return this.isEmpty ? out.set(0, 0, 0) : out.copy(this.#max).sub(this.#min);
  }

  /** Writes normalized [0, 1] coordinates for `point` within this box. */
  getParameter(point: Vector3, out: Vector3): Vector3 {
    return out.set(
      (point.x - this.#min.x) / (this.#max.x - this.#min.x),
      (point.y - this.#min.y) / (this.#max.y - this.#min.y),
      (point.z - this.#min.z) / (this.#max.z - this.#min.z),
    );
  }

  /** Clamps a point to this box and writes it to the supplied output vector. */
  clampPoint(point: Vector3, out: Vector3): Vector3 {
    return out.set(
      Math.max(this.#min.x, Math.min(this.#max.x, point.x)),
      Math.max(this.#min.y, Math.min(this.#max.y, point.y)),
      Math.max(this.#min.z, Math.min(this.#max.z, point.z)),
    );
  }

  /** Returns the Euclidean distance from this box to `point`. */
  distanceToPoint(point: Vector3): number {
    this.clampPoint(point, _vector);
    const dx = _vector.x - point.x;
    const dy = _vector.y - point.y;
    const dz = _vector.z - point.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /** Returns true when `box` overlaps this box. */
  intersectsBox(box: Box3): boolean {
    return (
      this.#max.x >= box.min.x &&
      this.#min.x <= box.max.x &&
      this.#max.y >= box.min.y &&
      this.#min.y <= box.max.y &&
      this.#max.z >= box.min.z &&
      this.#min.z <= box.max.z
    );
  }

  /** Returns true when the infinite `plane` crosses or touches this box. */
  intersectsPlane(plane: PlaneLike): boolean {
    let min: number;
    let max: number;

    if (plane.normal.x > 0) {
      min = plane.normal.x * this.#min.x;
      max = plane.normal.x * this.#max.x;
    } else {
      min = plane.normal.x * this.#max.x;
      max = plane.normal.x * this.#min.x;
    }

    if (plane.normal.y > 0) {
      min += plane.normal.y * this.#min.y;
      max += plane.normal.y * this.#max.y;
    } else {
      min += plane.normal.y * this.#max.y;
      max += plane.normal.y * this.#min.y;
    }

    if (plane.normal.z > 0) {
      min += plane.normal.z * this.#min.z;
      max += plane.normal.z * this.#max.z;
    } else {
      min += plane.normal.z * this.#max.z;
      max += plane.normal.z * this.#min.z;
    }

    return min <= -plane.constant && max >= -plane.constant;
  }

  /** Returns true when `triangle` overlaps this box using the 13-axis SAT. */
  intersectsTriangle(triangle: TriangleLike): boolean {
    if (this.isEmpty) return false;

    this.getCenter(_center);
    _extents.copy(this.#max).sub(_center);

    _v0.copy(triangle.a).sub(_center);
    _v1.copy(triangle.b).sub(_center);
    _v2.copy(triangle.c).sub(_center);

    _f0.copy(_v1).sub(_v0);
    _f1.copy(_v2).sub(_v1);
    _f2.copy(_v0).sub(_v2);

    if (
      !(
        _satForAxis(0, -_f0.z, _f0.y, _v0, _v1, _v2, _extents) &&
        _satForAxis(0, -_f1.z, _f1.y, _v0, _v1, _v2, _extents) &&
        _satForAxis(0, -_f2.z, _f2.y, _v0, _v1, _v2, _extents) &&
        _satForAxis(_f0.z, 0, -_f0.x, _v0, _v1, _v2, _extents) &&
        _satForAxis(_f1.z, 0, -_f1.x, _v0, _v1, _v2, _extents) &&
        _satForAxis(_f2.z, 0, -_f2.x, _v0, _v1, _v2, _extents) &&
        _satForAxis(-_f0.y, _f0.x, 0, _v0, _v1, _v2, _extents) &&
        _satForAxis(-_f1.y, _f1.x, 0, _v0, _v1, _v2, _extents) &&
        _satForAxis(-_f2.y, _f2.x, 0, _v0, _v1, _v2, _extents) &&
        _satForAxis(1, 0, 0, _v0, _v1, _v2, _extents) &&
        _satForAxis(0, 1, 0, _v0, _v1, _v2, _extents) &&
        _satForAxis(0, 0, 1, _v0, _v1, _v2, _extents)
      )
    ) {
      return false;
    }

    _triangleNormal.crossVectors(_f0, _f1);
    return _satForAxis(
      _triangleNormal.x,
      _triangleNormal.y,
      _triangleNormal.z,
      _v0,
      _v1,
      _v2,
      _extents,
    );
  }

  /** Writes a sphere enclosing this box into the supplied output object. */
  getBoundingSphere(out: BoundingSphereTarget): BoundingSphereTarget {
    if (this.isEmpty) {
      out.centre.set(0, 0, 0);
      out.radius = -1;
      return out;
    }

    this.getCenter(out.centre);
    const dx = this.#max.x - this.#min.x;
    const dy = this.#max.y - this.#min.y;
    const dz = this.#max.z - this.#min.z;
    out.radius = Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5;
    return out;
  }

  /** Returns true when `sphere` overlaps this box. */
  intersectsSphere(sphere: { centre: Vector3; radius: number }): boolean {
    _vector.x = fastMin(fastMax(sphere.centre.x, this.#min.x), this.#max.x);
    _vector.y = fastMin(fastMax(sphere.centre.y, this.#min.y), this.#max.y);
    _vector.z = fastMin(fastMax(sphere.centre.z, this.#min.z), this.#max.z);
    _vector.sub(sphere.centre);
    return _vector.lengthSq <= sphere.radius * sphere.radius;
  }

  /** Resets both corners to the empty-box sentinel bounds. */
  makeEmpty(): this {
    this.#min.set(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    );
    this.#max.set(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    );
    return this;
  }

  /** Replaces the box from a center point and dimensions. */
  setFromCentreAndSize(centre: Vector3, size: Vector3): this {
    return this.setFromCenterAndSize(centre, size);
  }

  /** Replaces the box from a center point and dimensions. */
  setFromCenterAndSize(center: Vector3, size: Vector3): this {
    const halfX = size.x * 0.5;
    const halfY = size.y * 0.5;
    const halfZ = size.z * 0.5;
    this.#min.set(center.x - halfX, center.y - halfY, center.z - halfZ);
    this.#max.set(center.x + halfX, center.y + halfY, center.z + halfZ);
    return this;
  }

  /**
   * Computes the world-space bounding box of an object and its visible
   * children. Accesses vertex positions via `object.geometry?.attributes?.position`
   * for Mesh nodes; will be refined once Geometry is implemented.
   */
  setFromObject(object: SceneNode): this {
    this.makeEmpty();
    object.updateMatrixWorld(true, false);
    this.#expandFromObject(object);
    return this;
  }

  #expandFromObject(obj: SceneNode): void {
    if (obj.type === "Mesh") {
      const posAttr = obj.geometry?.attributes?.position;
      if (posAttr && posAttr.array.length > 0) {
        obj.updateMatrixWorld(false, false);
        const arr = posAttr.array;
        const itemSize = posAttr.itemSize ?? 3;
        const count = arr.length / itemSize;
        for (let i = 0; i < count; i++) {
          const vertex = new Vector3(
            arr[i * itemSize] as number,
            arr[i * itemSize + 1] as number,
            arr[i * itemSize + 2] as number,
          );
          this.expandByPoint(vertex.applyMatrix4(obj.matrixWorld));
        }
      }
    }
    for (const child of obj.children) {
      if (child.visible) this.#expandFromObject(child);
    }
  }

  /** Replaces the bounds with the smallest box containing `points`. */
  setFromPoints(points: readonly Vector3[]): this {
    this.makeEmpty();
    for (const point of points) {
      this.expandByPoint(point);
    }
    return this;
  }

  /** Translates both corners by `offset` in place. */
  translate(offset: Vector3): this {
    this.#min.add(offset);
    this.#max.add(offset);
    return this;
  }

  /** Expands this box to include the bounds of `box`. */
  union(box: Box3): this {
    const { x, y, z } = this.#min;
    const { x: x2, y: y2, z: z2 } = this.#max;
    const { x: px, y: py, z: pz } = box.min;
    const { x: px2, y: py2, z: pz2 } = box.max;

    this.#min.x = fastMin(x, px);
    this.#min.y = fastMin(y, py);
    this.#min.z = fastMin(z, pz);
    this.#max.x = fastMax(x2, px2);
    this.#max.y = fastMax(y2, py2);
    this.#max.z = fastMax(z2, pz2);
    return this;
  }

  /** Replaces this box with its intersection with `box`. */
  intersect(box: Box3): this {
    this.#min.x = Math.max(this.#min.x, box.min.x);
    this.#min.y = Math.max(this.#min.y, box.min.y);
    this.#min.z = Math.max(this.#min.z, box.min.z);
    this.#max.x = Math.min(this.#max.x, box.max.x);
    this.#max.y = Math.min(this.#max.y, box.max.y);
    this.#max.z = Math.min(this.#max.z, box.max.z);
    if (this.isEmpty) this.makeEmpty();
    return this;
  }

  /** Transforms all eight corners and recomputes the enclosing box. */
  applyMatrix4(matrix: Matrix4): this {
    if (this.isEmpty) return this;

    const minX = this.#min.x;
    const minY = this.#min.y;
    const minZ = this.#min.z;
    const maxX = this.#max.x;
    const maxY = this.#max.y;
    const maxZ = this.#max.z;

    _points[0].set(minX, minY, minZ).applyMatrix4(matrix);
    _points[1].set(minX, minY, maxZ).applyMatrix4(matrix);
    _points[2].set(minX, maxY, minZ).applyMatrix4(matrix);
    _points[3].set(minX, maxY, maxZ).applyMatrix4(matrix);
    _points[4].set(maxX, minY, minZ).applyMatrix4(matrix);
    _points[5].set(maxX, minY, maxZ).applyMatrix4(matrix);
    _points[6].set(maxX, maxY, minZ).applyMatrix4(matrix);
    _points[7].set(maxX, maxY, maxZ).applyMatrix4(matrix);

    return this.setFromPoints(_points);
  }

  /** Serializes finite bounds as `{ min, max }`; empty boxes use empty arrays. */
  toJSON(): { min: number[]; max: number[] } {
    if (this.isEmpty) return { min: [], max: [] };
    return {
      min: [this.#min.x, this.#min.y, this.#min.z],
      max: [this.#max.x, this.#max.y, this.#max.z],
    };
  }

  /** Restores this value from its serialized JSON representation. */
  fromJSON(json: { min: ArrayLike<number>; max: ArrayLike<number> }): this {
    if (json.min.length < 3 || json.max.length < 3) return this.makeEmpty();
    this.#min.set(
      json.min[0] as number,
      json.min[1] as number,
      json.min[2] as number,
    );
    this.#max.set(
      json.max[0] as number,
      json.max[1] as number,
      json.max[2] as number,
    );
    return this;
  }
}
