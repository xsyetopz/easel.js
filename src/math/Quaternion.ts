/** Mutable flat storage accepted by quaternion array operations. */
export type QuaternionArray = number[] | Float32Array | Float64Array;

/**
 * Spherically interpolates two quaternions stored in flat arrays.
 * Writes four values into destination without creating Quaternion objects.
 */
export function slerpQuaternionsFlat<Destination extends QuaternionArray>(
  destination: Destination,
  destinationOffset: number,
  start: ArrayLike<number>,
  startOffset: number,
  end: ArrayLike<number>,
  endOffset: number,
  alpha: number,
): Destination {
  let x0 = start[startOffset];
  let y0 = start[startOffset + 1];
  let z0 = start[startOffset + 2];
  let w0 = start[startOffset + 3];
  let x1 = end[endOffset];
  let y1 = end[endOffset + 1];
  let z1 = end[endOffset + 2];
  let w1 = end[endOffset + 3];

  if (w0 !== w1 || x0 !== x1 || y0 !== y1 || z0 !== z1) {
    let dot = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1;
    if (dot < 0) {
      x1 = -x1;
      y1 = -y1;
      z1 = -z1;
      w1 = -w1;
      dot = -dot;
    }

    let startWeight = 1 - alpha;
    if (dot < 0.9995) {
      const theta = Math.acos(dot);
      const sinTheta = Math.sin(theta);
      startWeight = Math.sin(startWeight * theta) / sinTheta;
      const endWeight = Math.sin(alpha * theta) / sinTheta;
      x0 = x0 * startWeight + x1 * endWeight;
      y0 = y0 * startWeight + y1 * endWeight;
      z0 = z0 * startWeight + z1 * endWeight;
      w0 = w0 * startWeight + w1 * endWeight;
    } else {
      x0 = x0 * startWeight + x1 * alpha;
      y0 = y0 * startWeight + y1 * alpha;
      z0 = z0 * startWeight + z1 * alpha;
      w0 = w0 * startWeight + w1 * alpha;
      const inverseLength =
        1 / Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0 + w0 * w0);
      x0 *= inverseLength;
      y0 *= inverseLength;
      z0 *= inverseLength;
      w0 *= inverseLength;
    }
  }

  destination[destinationOffset] = x0;
  destination[destinationOffset + 1] = y0;
  destination[destinationOffset + 2] = z0;
  destination[destinationOffset + 3] = w0;
  return destination;
}

/**
 * Multiplies two quaternions stored in flat arrays.
 * Writes four values into destination without creating Quaternion objects.
 */
export function multiplyQuaternionsFlat<Destination extends QuaternionArray>(
  destination: Destination,
  destinationOffset: number,
  left: ArrayLike<number>,
  leftOffset: number,
  right: ArrayLike<number>,
  rightOffset: number,
): Destination {
  const x0 = left[leftOffset];
  const y0 = left[leftOffset + 1];
  const z0 = left[leftOffset + 2];
  const w0 = left[leftOffset + 3];
  const x1 = right[rightOffset];
  const y1 = right[rightOffset + 1];
  const z1 = right[rightOffset + 2];
  const w1 = right[rightOffset + 3];

  destination[destinationOffset] = x0 * w1 + w0 * x1 + y0 * z1 - z0 * y1;
  destination[destinationOffset + 1] = y0 * w1 + w0 * y1 + z0 * x1 - x0 * z1;
  destination[destinationOffset + 2] = z0 * w1 + w0 * z1 + x0 * y1 - y0 * x1;
  destination[destinationOffset + 3] = w0 * w1 - x0 * x1 - y0 * y1 - z0 * z1;
  return destination;
}

/** Unit quaternion for rotation without gimbal lock. */
export class Quaternion {
  #x = 0;
  #y = 0;
  #z = 0;
  #w = 1;

  /** Constructs a quaternion, defaulting to the identity rotation. */
  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this.#x = x;
    this.#y = y;
    this.#z = z;
    this.#w = w;
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

  /** Homogeneous w component. */
  get w(): number {
    return this.#w;
  }

  /** Replaces the homogeneous w component. */
  set w(value: number) {
    this.#w = value;
  }

  /** Euclidean magnitude of this value. */
  get length(): number {
    return Math.sqrt(this.lengthSq);
  }

  /** Squared Euclidean magnitude, avoiding a square root. */
  get lengthSq(): number {
    const { x, y, z, w } = this;
    return x * x + y * y + z * z + w * w;
  }

  /** Returns the angle between this quaternion and q in radians. */
  angleTo(q: Quaternion): number {
    const dot = this.dot(q);
    const clamped = dot < -1 ? -1 : dot > 1 ? 1 : dot;
    return 2 * Math.acos(Math.abs(clamped));
  }

  /** Returns a new instance with the same component values. */
  clone(): Quaternion {
    return new Quaternion().copy(this);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(q: Quaternion): this {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
  }

  /** Negates the vector part, producing the quaternion conjugate. */
  conjugate(): this {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  /** Returns the four-component dot product with `q`. */
  dot(q: Quaternion): number {
    return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
  }

  /** Divides every component by `scalar` in place. */
  divideScalar(scalar: number): this {
    this.x /= scalar;
    this.y /= scalar;
    this.z /= scalar;
    this.w /= scalar;
    return this;
  }

  /** Reads this value's components from `array` starting at `offset`. */
  fromArray(array: ArrayLike<number>, offset: number = 0): this {
    this.x = array[offset];
    this.y = array[offset + 1];
    this.z = array[offset + 2];
    this.w = array[offset + 3];
    return this;
  }

  /** Returns true when every stored component exactly matches the argument. */
  equals(q: Quaternion): boolean {
    return this.x === q.x && this.y === q.y && this.z === q.z && this.w === q.w;
  }

  /** Replaces this quaternion with the identity rotation. */
  identity(): this {
    return this.set(0, 0, 0, 1);
  }

  /** Computes the conjugate (assumes unit quaternion). */
  invert(): this {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  /** Pre-multiplies this quaternion by q (Hamilton product: q * this). */
  premultiply(q: Quaternion): this {
    const { x, y, z, w } = this;
    const { x: qx, y: qy, z: qz, w: qw } = q;

    this.x = qx * w + qw * x + qy * z - qz * y;
    this.y = qy * w + qw * y + qz * x - qx * z;
    this.z = qz * w + qw * z + qx * y - qy * x;
    this.w = qw * w - qx * x - qy * y - qz * z;
    return this;
  }

  /** Post-multiplies this quaternion by `q` using the Hamilton product. */
  multiply(q: Quaternion): this {
    return this.multiplyQuaternions(this, q);
  }

  /** Stores the Hamilton product `a * b` in this quaternion. */
  multiplyQuaternions(a: Quaternion, b: Quaternion): this {
    const { x: ax, y: ay, z: az, w: aw } = a;
    const { x: bx, y: by, z: bz, w: bw } = b;
    this.x = ax * bw + aw * bx + ay * bz - az * by;
    this.y = ay * bw + aw * by + az * bx - ax * bz;
    this.z = az * bw + aw * bz + ax * by - ay * bx;
    this.w = aw * bw - ax * bx - ay * by - az * bz;
    return this;
  }

  /** Replaces all stored components with the supplied values. */
  set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  /** Replaces this quaternion from an axis and angle in radians. */
  setFromAxisAngle(
    axis: { x: number; y: number; z: number },
    angle: number,
  ): this {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);

    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(halfAngle);
    return this;
  }

  /** Replaces components with Euler angle values. */
  setFromEuler(euler: {
    x: number;
    y: number;
    z: number;
    order: string;
  }): this {
    const { x, y, z, order } = euler;

    // Hot-path: single-axis rotations are common in animation (e.g. yaw-only).
    // Order does not matter when only one component is non-zero.
    if (y !== 0 && x === 0 && z === 0) {
      const half = y / 2;
      this.x = 0;
      this.y = Math.sin(half);
      this.z = 0;
      this.w = Math.cos(half);
      return this;
    }
    if (x !== 0 && y === 0 && z === 0) {
      const half = x / 2;
      this.x = Math.sin(half);
      this.y = 0;
      this.z = 0;
      this.w = Math.cos(half);
      return this;
    }
    if (z !== 0 && x === 0 && y === 0) {
      const half = z / 2;
      this.x = 0;
      this.y = 0;
      this.z = Math.sin(half);
      this.w = Math.cos(half);
      return this;
    }

    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);

    switch (order) {
      case "XYZ":
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;
        return this;
      case "YXZ":
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;
        return this;
      case "ZXY":
        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;
        return this;
      case "ZYX":
        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;
        return this;
      case "YZX":
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;
        return this;
      case "XZY":
        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;
        return this;
      default:
        return this;
    }
  }

  /** Replaces this quaternion from a rotation matrix. */
  setFromRotationMatrix(m: { elements: ArrayLike<number> }): this {
    const te = m.elements;

    const m11 = te[0];
    const m12 = te[4];
    const m13 = te[8];
    const m21 = te[1];
    const m22 = te[5];
    const m23 = te[9];
    const m31 = te[2];
    const m32 = te[6];
    const m33 = te[10];

    const trace = m11 + m22 + m33;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);

      this.w = 0.25 / s;
      this.x = (m32 - m23) * s;
      this.y = (m13 - m31) * s;
      this.z = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);

      this.w = (m32 - m23) / s;
      this.x = 0.25 * s;
      this.y = (m12 + m21) / s;
      this.z = (m13 + m31) / s;
    } else if (m22 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);

      this.w = (m13 - m31) / s;
      this.x = (m12 + m21) / s;
      this.y = 0.25 * s;
      this.z = (m23 + m32) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);

      this.w = (m21 - m12) / s;
      this.x = (m13 + m31) / s;
      this.y = (m23 + m32) / s;
      this.z = 0.25 * s;
    }
    return this;
  }

  /** Replaces this quaternion with the shortest rotation from `from` to `to`. */
  setFromUnitVectors(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
  ): this {
    let r = from.x * to.x + from.y * to.y + from.z * to.z + 1;
    if (r < 1e-8) {
      r = 0;
      if (Math.abs(from.x) > Math.abs(from.z)) {
        this.x = -from.y;
        this.y = from.x;
        this.z = 0;
        this.w = r;
      } else {
        this.x = 0;
        this.y = -from.z;
        this.z = from.y;
        this.w = r;
      }
    } else {
      this.x = from.y * to.z - from.z * to.y;
      this.y = from.z * to.x - from.x * to.z;
      this.z = from.x * to.y - from.y * to.x;
      this.w = r;
    }
    return this.normalize();
  }

  /** Rotates toward `q` by at most `step` radians. */
  rotateTowards(q: Quaternion, step: number): this {
    const angle = this.angleTo(q);
    if (angle === 0) return this;
    return this.slerp(q, Math.min(1, step / angle));
  }

  /** Rescales this quaternion to unit length. */
  normalize(): this {
    return this.divideScalar(this.length || 1);
  }

  /** Spherically interpolates toward `q` by `t`. */
  slerp(q: Quaternion, t: number): this {
    let x = q.x;
    let y = q.y;
    let z = q.z;
    let w = q.w;
    let dot = this.dot(q);

    if (dot < 0) {
      x = -x;
      y = -y;
      z = -z;
      w = -w;
      dot = -dot;
    }

    const s = 1 - t;
    if (dot < 0.9995) {
      const theta = Math.acos(dot);
      const sin = Math.sin(theta);
      const factor0 = Math.sin(s * theta) / sin;
      const factor1 = Math.sin(t * theta) / sin;
      this.x = this.x * factor0 + x * factor1;
      this.y = this.y * factor0 + y * factor1;
      this.z = this.z * factor0 + z * factor1;
      this.w = this.w * factor0 + w * factor1;
    } else {
      this.x = this.x * s + x * t;
      this.y = this.y * s + y * t;
      this.z = this.z * s + z * t;
      this.w = this.w * s + w * t;
      this.normalize();
    }
    return this;
  }

  /** Stores the spherical interpolation of `a` and `b` at `t`. */
  slerpQuaternions(a: Quaternion, b: Quaternion, t: number): this {
    return this.copy(a).slerp(b, t);
  }

  /** Replaces this quaternion with a uniformly distributed random unit rotation. */
  random(): this {
    const theta1 = 2 * Math.PI * Math.random();
    const theta2 = 2 * Math.PI * Math.random();
    const x0 = Math.random();
    const r1 = Math.sqrt(1 - x0);
    const r2 = Math.sqrt(x0);
    return this.set(
      r1 * Math.sin(theta1),
      r1 * Math.cos(theta1),
      r2 * Math.sin(theta2),
      r2 * Math.cos(theta2),
    );
  }

  /** Writes this value's components to `array` starting at `offset`. */
  toArray(out: number[] = [], offset: number = 0): number[] {
    out[offset] = this.x;
    out[offset + 1] = this.y;
    out[offset + 2] = this.z;
    out[offset + 3] = this.w;
    return out;
  }

  /** Serializes this value into its JSON representation. */
  toJSON(): number[] {
    return this.toArray();
  }

  /** Iterates over components in storage order. */
  *[Symbol.iterator](): Generator<number> {
    yield this.x;
    yield this.y;
    yield this.z;
    yield this.w;
  }
}
