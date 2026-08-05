/** Computes the dot product of the given components against a target vector. */
export function dot4(
  x: number,
  y: number,
  z: number,
  w: number,
  target: Vector4 = new Vector4(),
): number {
  return x * target.x + y * target.y + z * target.z + w * target.w;
}

/** 4D vector with x, y, z, w components. */
export class Vector4 {
  #x = 0;
  #y = 0;
  #z = 0;
  #w = 1;

  /** Constructs a 4D vector from x, y, z, and w components. */
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
  set x(v: number) {
    this.#x = v;
  }

  /** Vertical Cartesian component. */
  get y(): number {
    return this.#y;
  }

  /** Replaces the Cartesian y component. */
  set y(v: number) {
    this.#y = v;
  }

  /** Cartesian z component. */
  get z(): number {
    return this.#z;
  }

  /** Replaces the Cartesian z component. */
  set z(v: number) {
    this.#z = v;
  }

  /** Homogeneous w component. */
  get w(): number {
    return this.#w;
  }

  /** Replaces the homogeneous w component. */
  set w(v: number) {
    this.#w = v;
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
    const { x, y, z, w } = this;
    return x * x + y * y + z * z + w * w;
  }

  /** Adds `v` component by component in place. */
  add(v: Vector4): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    this.w += v.w;
    return this;
  }

  /** Adds `scalar` to every component in place. */
  addScalar(scalar: number): this {
    this.x += scalar;
    this.y += scalar;
    this.z += scalar;
    this.w += scalar;
    return this;
  }

  /** Adds `v` multiplied by `s` to this vector. */
  addScaledVector(v: Vector4, s: number): this {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    this.w += v.w * s;
    return this;
  }

  /** Stores the component-wise sum of `a` and `b` in this vector. */
  addVectors(a: Vector4, b: Vector4): this {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    this.z = a.z + b.z;
    this.w = a.w + b.w;
    return this;
  }

  /** Multiplies this vector by a 4x4 matrix in column-major order. */
  applyMatrix4(m: { elements: ArrayLike<number> }): this {
    const { x, y, z, w } = this;
    const e = m.elements;
    this.x = e[0] * x + e[4] * y + e[8] * z + e[12] * w;
    this.y = e[1] * x + e[5] * y + e[9] * z + e[13] * w;
    this.z = e[2] * x + e[6] * y + e[10] * z + e[14] * w;
    this.w = e[3] * x + e[7] * y + e[11] * z + e[15] * w;
    return this;
  }

  /** Returns a new instance with the same component values. */
  clone(): Vector4 {
    return new Vector4(this.x, this.y, this.z, this.w);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(v: Vector4): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    this.w = v.w;
    return this;
  }

  /** Divides components by the corresponding components of `v`. */
  divide(v: Vector4): this {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    this.w /= v.w;
    return this;
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
  fromArray(a: ArrayLike<number>, offset: number = 0): this {
    this.x = a[offset];
    this.y = a[offset + 1];
    this.z = a[offset + 2];
    this.w = a[offset + 3];
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
      case 3:
        return this.w;
      default:
        throw new RangeError(
          `Vector4.getComponent(): index out of range: ${index}`,
        );
    }
  }

  /** Returns the dot product with `v`. */
  dot(v: Vector4): number {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
  }

  /** Rounds every component up to the nearest integer. */
  ceil(): this {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    this.z = Math.ceil(this.z);
    this.w = Math.ceil(this.w);
    return this;
  }

  /** Clamps each component between corresponding components of `min` and `max`. */
  clamp(min: Vector4, max: Vector4): this {
    this.x = Math.max(min.x, Math.min(max.x, this.x));
    this.y = Math.max(min.y, Math.min(max.y, this.y));
    this.z = Math.max(min.z, Math.min(max.z, this.z));
    this.w = Math.max(min.w, Math.min(max.w, this.w));
    return this;
  }

  /** Clamps the Euclidean magnitude to [`min`, `max`]. */
  clampLength(min: number, max: number): this {
    const length = this.length;
    const clamped = Math.max(min, Math.min(max, length));
    return this.divideScalar(length || 1).multiplyScalar(clamped);
  }

  /** Clamps every component to [`min`, `max`]. */
  clampScalar(min: number, max: number): this {
    this.x = Math.max(min, Math.min(max, this.x));
    this.y = Math.max(min, Math.min(max, this.y));
    this.z = Math.max(min, Math.min(max, this.z));
    this.w = Math.max(min, Math.min(max, this.w));
    return this;
  }

  /** Rounds every component down to the nearest integer. */
  floor(): this {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    this.z = Math.floor(this.z);
    this.w = Math.floor(this.w);
    return this;
  }

  /** Returns the sum of absolute component values. */
  get manhattanLength(): number {
    return (
      Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z) + Math.abs(this.w)
    );
  }

  /** Linearly interpolates toward `v` by `alpha`. */
  lerp(v: Vector4, alpha: number): this {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    this.w += (v.w - this.w) * alpha;
    return this;
  }

  /** Stores the interpolation of `v1` and `v2` at `alpha`. */
  lerpVectors(v1: Vector4, v2: Vector4, alpha: number): this {
    this.x = v1.x + (v2.x - v1.x) * alpha;
    this.y = v1.y + (v2.y - v1.y) * alpha;
    this.z = v1.z + (v2.z - v1.z) * alpha;
    this.w = v1.w + (v2.w - v1.w) * alpha;
    return this;
  }

  /** Replaces each component with the larger value from this vector and `v`. */
  max(v: Vector4): this {
    this.x = Math.max(this.x, v.x);
    this.y = Math.max(this.y, v.y);
    this.z = Math.max(this.z, v.z);
    this.w = Math.max(this.w, v.w);
    return this;
  }

  /** Replaces each component with the smaller value from this vector and `v`. */
  min(v: Vector4): this {
    this.x = Math.min(this.x, v.x);
    this.y = Math.min(this.y, v.y);
    this.z = Math.min(this.z, v.z);
    this.w = Math.min(this.w, v.w);
    return this;
  }

  /** Multiplies components by the corresponding components of `v`. */
  multiply(v: Vector4): this {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    this.w *= v.w;
    return this;
  }

  /** Multiplies every component by `scalar` in place. */
  multiplyScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    this.w *= scalar;
    return this;
  }

  /** Negates every component. */
  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    this.w = -this.w;
    return this;
  }

  /** Rounds every component to the nearest integer. */
  round(): this {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    this.z = Math.round(this.z);
    this.w = Math.round(this.w);
    return this;
  }

  /** Rounds every component toward zero. */
  roundToZero(): this {
    this.x = Math.trunc(this.x);
    this.y = Math.trunc(this.y);
    this.z = Math.trunc(this.z);
    this.w = Math.trunc(this.w);
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
      case 3:
        this.w = value;
        break;
      default:
        throw new RangeError(
          `Vector4.setComponent(): index out of range: ${index}`,
        );
    }
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

  /** Replaces this vector with an axis-angle representation of `q`. */
  setAxisAngleFromQuaternion(q: {
    x: number;
    y: number;
    z: number;
    w: number;
  }): this {
    this.w = 2 * Math.acos(q.w);
    const s = Math.sqrt(1 - q.w * q.w);
    if (s < 0.0001) {
      this.x = 1;
      this.y = 0;
      this.z = 0;
    } else {
      this.x = q.x / s;
      this.y = q.y / s;
      this.z = q.z / s;
    }
    return this;
  }

  /** Replaces this vector with an axis-angle representation of `m`. */
  setAxisAngleFromRotationMatrix(m: { elements: ArrayLike<number> }): this {
    let angle: number;
    let x: number;
    let y: number;
    let z: number;
    const epsilon = 0.01;
    const epsilon2 = 0.1;
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

    if (
      Math.abs(m12 - m21) < epsilon &&
      Math.abs(m13 - m31) < epsilon &&
      Math.abs(m23 - m32) < epsilon
    ) {
      if (
        Math.abs(m12 + m21) < epsilon2 &&
        Math.abs(m13 + m31) < epsilon2 &&
        Math.abs(m23 + m32) < epsilon2 &&
        Math.abs(m11 + m22 + m33 - 3) < epsilon2
      ) {
        return this.set(1, 0, 0, 0);
      }

      angle = Math.PI;
      const xx = (m11 + 1) / 2;
      const yy = (m22 + 1) / 2;
      const zz = (m33 + 1) / 2;
      const xy = (m12 + m21) / 4;
      const xz = (m13 + m31) / 4;
      const yz = (m23 + m32) / 4;

      if (xx > yy && xx > zz) {
        if (xx < epsilon) {
          x = 0;
          y = 0.707106781;
          z = 0.707106781;
        } else {
          x = Math.sqrt(xx);
          y = xy / x;
          z = xz / x;
        }
      } else if (yy > zz) {
        if (yy < epsilon) {
          x = 0.707106781;
          y = 0;
          z = 0.707106781;
        } else {
          y = Math.sqrt(yy);
          x = xy / y;
          z = yz / y;
        }
      } else if (zz < epsilon) {
        x = 0.707106781;
        y = 0.707106781;
        z = 0;
      } else {
        z = Math.sqrt(zz);
        x = xz / z;
        y = yz / z;
      }
      return this.set(x, y, z, angle);
    }

    let s = Math.sqrt(
      (m32 - m23) * (m32 - m23) +
        (m13 - m31) * (m13 - m31) +
        (m21 - m12) * (m21 - m12),
    );
    if (Math.abs(s) < 0.001) s = 1;
    this.x = (m32 - m23) / s;
    this.y = (m13 - m31) / s;
    this.z = (m21 - m12) / s;
    this.w = Math.acos((m11 + m22 + m33 - 1) / 2);
    return this;
  }

  /** Reads the translation column of `m`. */
  setFromMatrixPosition(m: { elements: ArrayLike<number> }): this {
    const e = m.elements;
    this.x = e[12];
    this.y = e[13];
    this.z = e[14];
    this.w = e[15];
    return this;
  }

  /** Sets every component to `scalar`. */
  setScalar(scalar: number): this {
    this.x = scalar;
    this.y = scalar;
    this.z = scalar;
    this.w = scalar;
    return this;
  }

  /** Subtracts `v` component by component in place. */
  sub(v: Vector4): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    this.w -= v.w;
    return this;
  }

  /** Subtracts `scalar` from every component in place. */
  subScalar(scalar: number): this {
    this.x -= scalar;
    this.y -= scalar;
    this.z -= scalar;
    this.w -= scalar;
    return this;
  }

  /** Stores the component-wise difference of `a` and `b` in this vector. */
  subVectors(a: Vector4, b: Vector4): this {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    this.w = a.w - b.w;
    return this;
  }

  /** Returns true when every stored component exactly matches the argument. */
  equals(v: Vector4): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
  }

  /** Writes this value's components to `array` starting at `offset`. */
  toArray(out: number[] = [], offset: number = 0): number[] {
    out[offset] = this.x;
    out[offset + 1] = this.y;
    out[offset + 2] = this.z;
    out[offset + 3] = this.w;
    return out;
  }

  /** Replaces every component with an independent random value in [0, 1). */
  random(): this {
    this.x = Math.random();
    this.y = Math.random();
    this.z = Math.random();
    this.w = Math.random();
    return this;
  }

  /** Normalizes this vector to unit length. */
  normalize(): this {
    return this.divideScalar(this.length || 1);
  }

  /** Iterates over components in storage order. */
  *[Symbol.iterator](): Generator<number> {
    yield this.x;
    yield this.y;
    yield this.z;
    yield this.w;
  }
}
