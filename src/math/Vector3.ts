import { Quaternion } from "./Quaternion.ts";

const _q = new Quaternion();

/** 3D vector with x, y, z components. */
export class Vector3 {
  #x = 0;
  #y = 0;
  #z = 0;

  constructor(x = 0, y = 0, z = 0) {
    this.#x = x;
    this.#y = y;
    this.#z = z;
  }

  get x(): number {
    return this.#x;
  }

  set x(value: number) {
    this.#x = value;
  }

  get y(): number {
    return this.#y;
  }

  set y(value: number) {
    this.#y = value;
  }

  get z(): number {
    return this.#z;
  }

  set z(value: number) {
    this.#z = value;
  }

  get length(): number {
    return Math.sqrt(this.lengthSq);
  }

  get lengthSq(): number {
    const { x, y, z } = this;
    return x * x + y * y + z * z;
  }

  add(v: Vector3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  /** Applies an Euler rotation (XYZ order) in-place. */
  applyEuler(euler: { x: number; y: number; z: number; order: string }): this {
    _q.setFromEuler(euler);
    return this.applyQuaternion(_q);
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

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  copy(v: Vector3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  /** Cross product of two 3D vectors, returned as a new Vector3. */
  static cross(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
  ): Vector3 {
    return new Vector3(y1 * z2 - y2 * z1, z1 * x2 - z2 * x1, x1 * y2 - x2 * y1);
  }

  /** Sets this vector to the cross product of this x v. */
  cross(v: Vector3): this {
    return this.crossVectors(this, v);
  }

  /** Sets this vector to the cross product of a x b. */
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

  distanceTo(v: Vector3): number {
    return Math.sqrt(this.distanceSqTo(v));
  }

  distanceSqTo(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  divScalar(scalar: number): this {
    return this.mulScalar(1 / scalar);
  }

  /** Dot product of (x, y, z) with a target vector. */
  static dot(
    x: number,
    y: number,
    z: number,
    target: Vector3 = new Vector3(),
  ): number {
    return x * target.x + y * target.y + z * target.z;
  }

  dot(v: { x: number; y: number; z: number }): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  equals(v: Vector3): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z;
  }

  fromArray(array: number[]): this {
    this.x = array[0];
    this.y = array[1];
    this.z = array[2];
    return this;
  }

  /** Linearly interpolates toward v by t. */
  lerp(v: Vector3, t: number): this {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }

  mulScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  /** Normalizes this vector to unit length. */
  normalize(): this {
    const len = this.length;
    return len > 0 ? this.divScalar(len) : this.set(0, 0, 0);
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

  setScalar(scalar: number): this {
    this.x = scalar;
    this.y = scalar;
    this.z = scalar;
    return this;
  }

  sub(v: Vector3): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  /** Sets this vector to a - b. */
  subVectors(a: Vector3, b: Vector3): this {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }

  /** Sets this vector from spherical coordinates. */
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

  *[Symbol.iterator](): Generator<number> {
    yield this.x;
    yield this.y;
    yield this.z;
  }
}
