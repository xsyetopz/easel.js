import type { Attribute } from "../geometry/Attribute.ts";
import { clamp } from "./MathUtils.ts";
import { Quaternion } from "./Quaternion.ts";
import type { Vector4 } from "./Vector4.ts";

/** Cross product of two 3D vectors, returned as a new Vector3. */
export function cross3(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
): Vector3 {
  return new Vector3(y1 * z2 - y2 * z1, z1 * x2 - z2 * x1, x1 * y2 - x2 * y1);
}

/** Dot product of (x, y, z) with a target vector. */
export function dot3(
  x: number,
  y: number,
  z: number,
  target: Vector3 = new Vector3(),
): number {
  return x * target.x + y * target.y + z * target.z;
}

const _q = new Quaternion();

type MatrixLike = { elements: ArrayLike<number> };
type CameraLike = {
  matrixWorld: MatrixLike;
  projectionMatrixInverse: MatrixLike;
};

/** 3D vector with x, y, z components. */
export class Vector3 {
  #x = 0;
  #y = 0;
  #z = 0;

  /** Constructs a 3D vector from x, y, and z components. */
  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.#x = x;
    this.#y = y;
    this.#z = z;
  }

  /** Cartesian x component. */
  get x(): number {
    return this.#x;
  }

  /** Replaces the Cartesian x component. */
  set x(value: number) {
    this.#x = value;
  }

  /** Vertical Cartesian component. */
  get y(): number {
    return this.#y;
  }

  /** Replaces the Cartesian y component. */
  set y(value: number) {
    this.#y = value;
  }

  /** Cartesian z component. */
  get z(): number {
    return this.#z;
  }

  /** Replaces the Cartesian z component. */
  set z(value: number) {
    this.#z = value;
  }

  /** Euclidean magnitude of this value. */
  get length(): number {
    return Math.sqrt(this.lengthSq);
  }

  /** Rescales this vector to the supplied length. */
  set length(value: number) {
    this.normalize().multiplyScalar(value);
  }

  /** Squared Euclidean magnitude, avoiding a square root. */
  get lengthSq(): number {
    const { x, y, z } = this;
    return x * x + y * y + z * z;
  }

  /** Adds `v` component by component in place. */
  add(v: Vector3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  /** Adds `scalar` to every component in place. */
  addScalar(scalar: number): this {
    this.x += scalar;
    this.y += scalar;
    this.z += scalar;
    return this;
  }

  /** Stores the component-wise sum of `a` and `b` in this vector. */
  addVectors(a: Vector3, b: Vector3): this {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    this.z = a.z + b.z;
    return this;
  }

  /** Adds `v` multiplied by `s` to this vector. */
  addScaledVector(v: Vector3 | Vector4, s: number): this {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    return this;
  }

  /** Applies an Euler rotation (XYZ order) in-place. */
  applyEuler(euler: { x: number; y: number; z: number; order: string }): this {
    _q.setFromEuler(euler);
    return this.applyQuaternion(_q);
  }

  /** Rotates this vector around a normalized axis by an angle in radians. */
  applyAxisAngle(
    axis: { x: number; y: number; z: number },
    angle: number,
  ): this {
    return this.applyQuaternion(_q.setFromAxisAngle(axis, angle));
  }

  /** Multiplies this vector by a 3x3 matrix (column-major flat array). */
  applyMatrix3(m: { elements: ArrayLike<number> }): this {
    const me = m.elements;
    const { x, y, z } = this;
    this.x = me[0] * x + me[3] * y + me[6] * z;
    this.y = me[1] * x + me[4] * y + me[7] * z;
    this.z = me[2] * x + me[5] * y + me[8] * z;
    return this;
  }

  /** Multiplies this vector by a 4x4 matrix (column-major flat array), treating w=1. */
  applyMatrix4(m: { elements: ArrayLike<number> }): this {
    const me = m.elements;
    const { x, y, z } = this;
    const w = 1 / (me[3] * x + me[7] * y + me[11] * z + me[15] || 1);
    this.x = (me[0] * x + me[4] * y + me[8] * z + me[12]) * w;
    this.y = (me[1] * x + me[5] * y + me[9] * z + me[13]) * w;
    this.z = (me[2] * x + me[6] * y + me[10] * z + me[14]) * w;
    return this;
  }

  /** Applies a normal matrix and normalizes the resulting direction. */
  applyNormalMatrix(m: MatrixLike): this {
    return this.applyMatrix3(m).normalize();
  }

  /** Rotates this vector by a quaternion. */
  applyQuaternion(q: { x: number; y: number; z: number; w: number }): this {
    const { x, y, z } = this;
    const qx = q.x;
    const qy = q.y;
    const qz = q.z;
    const qw = q.w;
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
  }

  /** Returns a new instance with the same component values. */
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(v: Vector3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  /** Stores the cross product of this vector and `v` in place. */
  cross(v: Vector3): this {
    return this.crossVectors(this, v);
  }

  /** Stores the cross product of `a` and `b` in this vector. */
  crossVectors(a: Vector3, b: Vector3): this {
    const ax = a.x;
    const ay = a.y;
    const az = a.z;
    const bx = b.x;
    const by = b.y;
    const bz = b.z;
    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
  }

  /** Returns the Euclidean distance from this vector to `v`. */
  distanceTo(v: Vector3): number {
    return Math.sqrt(this.distanceToSquared(v));
  }

  /** Returns the squared Euclidean distance from this vector to `v`. */
  distanceToSquared(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  /** Returns the angle to `v` in radians, or π/2 when either vector is zero. */
  angleTo(v: Vector3): number {
    const denominator = Math.sqrt(this.lengthSq * v.lengthSq);
    if (denominator === 0) return Math.PI / 2;
    return Math.acos(clamp(this.dot(v) / denominator, -1, 1));
  }

  /** Returns the sum of absolute component differences from `v`. */
  manhattanDistanceTo(v: Vector3): number {
    return (
      Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z)
    );
  }

  /** Divides every component by `scalar` in place. */
  divideScalar(scalar: number): this {
    return this.multiplyScalar(1 / scalar);
  }

  /** Divides components by the corresponding components of `v`. */
  divide(v: Vector3): this {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    return this;
  }

  /** Returns the dot product with `v`. */
  dot(v: { x: number; y: number; z: number }): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /** Returns true when every stored component exactly matches the argument. */
  equals(v: Vector3): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z;
  }

  /** Reads this value's components from `array` starting at `offset`. */
  fromArray(array: ArrayLike<number>, offset: number = 0): this {
    this.x = array[offset];
    this.y = array[offset + 1];
    this.z = array[offset + 2];
    return this;
  }

  /** Reads x, y, z from an Attribute at the given vertex index. */
  fromBufferAttribute(attribute: Attribute, index: number): this {
    this.x = attribute.getX(index);
    this.y = attribute.getY(index);
    this.z = attribute.getZ(index);
    return this;
  }

  /** Sets this vector from the r, g, b channels of a color-like object. */
  setFromColor(color: { r: number; g: number; b: number }): this {
    this.x = color.r;
    this.y = color.g;
    this.z = color.b;
    return this;
  }

  /** Sum of the absolute component values. */
  get manhattanLength(): number {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
  }

  /** Linearly interpolates toward `v` by `t`. */
  lerp(v: Vector3, t: number): this {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }

  /** Stores the linear interpolation of `a` and `b` using `t`. */
  lerpVectors(a: Vector3, b: Vector3, t: number): this {
    this.x = a.x + (b.x - a.x) * t;
    this.y = a.y + (b.y - a.y) * t;
    this.z = a.z + (b.z - a.z) * t;
    return this;
  }

  /** Clamps each component between the corresponding components of `min` and `max`. */
  clamp(min: Vector3, max: Vector3): this {
    this.x = clamp(this.x, min.x, max.x);
    this.y = clamp(this.y, min.y, max.y);
    this.z = clamp(this.z, min.z, max.z);
    return this;
  }

  /** Clamps every component to the inclusive scalar range [`min`, `max`]. */
  clampScalar(min: number, max: number): this {
    this.x = clamp(this.x, min, max);
    this.y = clamp(this.y, min, max);
    this.z = clamp(this.z, min, max);
    return this;
  }

  /** Clamps the Euclidean magnitude to the inclusive range [`min`, `max`]. */
  clampLength(min: number, max: number): this {
    const length = this.length;
    return this.divideScalar(length || 1).multiplyScalar(
      clamp(length, min, max),
    );
  }

  /** Rounds every component down to the nearest integer. */
  floor(): this {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    this.z = Math.floor(this.z);
    return this;
  }

  /** Rounds every component up to the nearest integer. */
  ceil(): this {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    this.z = Math.ceil(this.z);
    return this;
  }

  /** Rounds every component to the nearest integer. */
  round(): this {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    this.z = Math.round(this.z);
    return this;
  }

  /** Truncates every component toward zero. */
  roundToZero(): this {
    this.x = Math.trunc(this.x);
    this.y = Math.trunc(this.y);
    this.z = Math.trunc(this.z);
    return this;
  }

  /** Multiplies every component by `scalar` in place. */
  multiplyScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  /** Multiplies components by the corresponding components of `v`. */
  multiply(v: Vector3): this {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }

  /** Stores the component-wise product `a × b` in this vector. */
  multiplyVectors(a: Vector3, b: Vector3): this {
    this.x = a.x * b.x;
    this.y = a.y * b.y;
    this.z = a.z * b.z;
    return this;
  }

  /** Replaces each component with the larger of the two values. */
  max(v: Vector3): this {
    this.x = Math.max(this.x, v.x);
    this.y = Math.max(this.y, v.y);
    this.z = Math.max(this.z, v.z);
    return this;
  }

  /** Replaces each component with the smaller of the two values. */
  min(v: Vector3): this {
    this.x = Math.min(this.x, v.x);
    this.y = Math.min(this.y, v.y);
    this.z = Math.min(this.z, v.z);
    return this;
  }

  /** Projects this vector onto `v` in place. */
  projectOnVector(v: Vector3): this {
    const denominator = v.lengthSq;
    if (denominator === 0) return this.set(0, 0, 0);
    const scalar = this.dot(v) / denominator;
    return this.copy(v).multiplyScalar(scalar);
  }

  /** Removes the component along `normal`, projecting this vector onto a plane. */
  projectOnPlane(normal: Vector3): this {
    _v.copy(this).projectOnVector(normal);
    return this.sub(_v);
  }

  /** Reflects this vector across a plane with normalized `normal`. */
  reflect(normal: Vector3): this {
    return this.sub(_v.copy(normal).multiplyScalar(2 * this.dot(normal)));
  }

  /** Negates every component in place. */
  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  /** Normalizes this vector to unit length. */
  normalize(): this {
    const len = this.length;
    return len > 0 ? this.divideScalar(len) : this.set(0, 0, 0);
  }

  /**
   * Projects this world-space vector into normalized device coordinates
   * using the camera's matrixWorldInverse and projectionMatrix.
   */
  project(camera: {
    matrixWorldInverse: { elements: ArrayLike<number> };
    projectionMatrix: { elements: ArrayLike<number> };
  }): this {
    return this.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(
      camera.projectionMatrix,
    );
  }

  /** Converts this vector from NDC into world space using `camera`. */
  unproject(camera: CameraLike): this {
    return this.applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(
      camera.matrixWorld,
    );
  }

  /** Transforms a direction by the upper-left 3x3 matrix and normalizes it. */
  transformDirection(m: MatrixLike): this {
    const { x, y, z } = this;
    const e = m.elements;
    this.x = e[0] * x + e[4] * y + e[8] * z;
    this.y = e[1] * x + e[5] * y + e[9] * z;
    this.z = e[2] * x + e[6] * y + e[10] * z;
    return this.normalize();
  }

  /** Replaces all stored components with the supplied values. */
  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /** Reads the translation column from a 4x4 column-major matrix. */
  setFromMatrixPosition(m: { elements: ArrayLike<number> }): this {
    const me = m.elements;
    this.x = me[12];
    this.y = me[13];
    this.z = me[14];
    return this;
  }

  /** Replaces components with the scale magnitudes of `m`'s basis columns. */
  setFromMatrixScale(m: MatrixLike): this {
    const e = m.elements;
    this.x = Math.hypot(e[0], e[1], e[2]);
    this.y = Math.hypot(e[4], e[5], e[6]);
    this.z = Math.hypot(e[8], e[9], e[10]);
    return this;
  }

  /** Reads one 4×4 matrix column selected by `index`. */
  setFromMatrixColumn(m: MatrixLike, index: number): this {
    return this.fromArray(m.elements, index * 4);
  }

  /** Reads one 3×3 matrix column selected by `index`. */
  setFromMatrix3Column(m: MatrixLike, index: number): this {
    return this.fromArray(m.elements, index * 3);
  }

  /** Replaces components with Euler angle values. */
  setFromEuler(euler: { x: number; y: number; z: number }): this {
    return this.set(euler.x, euler.y, euler.z);
  }

  /** Replaces this vector from cylindrical coordinates. */
  setFromCylindrical(cylindrical: {
    radius: number;
    theta: number;
    y: number;
  }): this {
    return this.setFromCylindricalCoords(
      cylindrical.radius,
      cylindrical.theta,
      cylindrical.y,
    );
  }

  /** Replaces this vector from cylindrical radius, azimuth, and height. */
  setFromCylindricalCoords(radius: number, theta: number, y: number): this {
    this.x = radius * Math.sin(theta);
    this.y = y;
    this.z = radius * Math.cos(theta);
    return this;
  }

  /** Sets every component to `scalar`. */
  setScalar(scalar: number): this {
    this.x = scalar;
    this.y = scalar;
    this.z = scalar;
    return this;
  }

  /** Sets the component selected by `index` to `value`. */
  setComponent(index: number, value: number): this {
    switch (index) {
      case 0:
        this.x = value;
        break;
      case 1:
        this.y = value;
        break;
      case 2:
        this.z = value;
        break;
      default:
        throw new RangeError(`Vector3: index is out of range: ${index}`);
    }
    return this;
  }

  /** Returns the component selected by `index`. */
  getComponent(index: number): number {
    switch (index) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      case 2:
        return this.z;
      default:
        throw new RangeError(`Vector3: index is out of range: ${index}`);
    }
  }

  /** Subtracts `v` component by component in place. */
  sub(v: Vector3): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  /** Subtracts `scalar` from every component in place. */
  subScalar(scalar: number): this {
    this.x -= scalar;
    this.y -= scalar;
    this.z -= scalar;
    return this;
  }

  /** Writes this value's components to `array` starting at `offset`. */
  toArray(array: number[] = [], offset: number = 0): number[] {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    array[offset + 2] = this.z;
    return array;
  }

  /** Replaces each component with an independent random value in [0, 1). */
  random(): this {
    this.x = Math.random();
    this.y = Math.random();
    this.z = Math.random();
    return this;
  }

  /** Replaces this vector with a uniformly distributed unit direction. */
  randomDirection(): this {
    const theta = Math.random() * Math.PI * 2;
    const u = Math.random() * 2 - 1;
    const c = Math.sqrt(1 - u * u);
    this.x = c * Math.cos(theta);
    this.y = u;
    this.z = c * Math.sin(theta);
    return this;
  }

  /** Stores the component-wise difference `a - b` in this vector. */
  subVectors(a: Vector3, b: Vector3): this {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }

  /** Replaces this vector from spherical radius, polar angle, and azimuth. */
  setFromSpherical(s: { radius: number; phi: number; theta: number }): this {
    return this.setFromSphericalCoords(s.radius, s.phi, s.theta);
  }

  /**
   * Sets this vector from spherical coordinates (radius, phi, theta).
   * phi is polar angle from Y+ axis, theta is azimuthal angle from Z+ axis.
   */
  setFromSphericalCoords(radius: number, phi: number, theta: number): this {
    const sinPhiRadius = Math.sin(phi) * radius;
    this.x = sinPhiRadius * Math.sin(theta);
    this.y = Math.cos(phi) * radius;
    this.z = sinPhiRadius * Math.cos(theta);
    return this;
  }

  /** Iterates over components in storage order. */
  *[Symbol.iterator](): Generator<number> {
    yield this.x;
    yield this.y;
    yield this.z;
  }
}

const _v = new Vector3();
