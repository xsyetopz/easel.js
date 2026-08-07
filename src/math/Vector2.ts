import type { Attribute } from "../geometry/Attribute.ts";
import { clamp } from "./MathUtils.ts";

/** Cross product magnitude of two 2D vectors. */
export function cross2(x1: number, y1: number, x2: number, y2: number): number {
  return x1 * y2 - y1 * x2;
}

/** Dot product of (x, y) with a target vector. */
export function dot2(
  x: number,
  y: number,
  target: Vector2 = new Vector2(),
): number {
  return x * target.x + y * target.y;
}

/** 2D vector with x, y components. */
export class Vector2 {
  #x = 0;
  #y = 0;

  /** Constructs a 2D vector from x and y components. */
  constructor(x: number = 0, y: number = 0) {
    this.#x = x;
    this.#y = y;
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

  /** Alias for `x`. */
  get width(): number {
    return this.#x;
  }

  /** Sets the `x` component via the `width` alias. */
  set width(value: number) {
    this.#x = value;
  }

  /** Alias for `y`. */
  get height(): number {
    return this.#y;
  }

  /** Sets the `y` component via the `height` alias. */
  set height(value: number) {
    this.#y = value;
  }

  /** Adds `v` component by component in place. */
  add(v: Vector2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /** Adds `scalar` to every component in place. */
  addScalar(scalar: number): this {
    this.x += scalar;
    this.y += scalar;
    return this;
  }

  /** Stores the component-wise sum of `a` and `b` in this vector. */
  addVectors(a: Vector2, b: Vector2): this {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    return this;
  }

  /** Adds `v` multiplied by `s` to this vector. */
  addScaledVector(v: Vector2, s: number): this {
    this.x += v.x * s;
    this.y += v.y * s;
    return this;
  }

  /** Returns a new instance with the same component values. */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(v: Vector2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  /** 2D cross product (scalar). */
  cross(v: Vector2): number {
    return this.x * v.y - this.y * v.x;
  }

  /** Polar angle of this vector in radians. */
  get angle(): number {
    return Math.atan2(-this.y, -this.x) + Math.PI;
  }

  /** Returns the angle to `v` in radians, or π/2 when either vector is zero. */
  angleTo(v: Vector2): number {
    const denominator = Math.sqrt(this.lengthSq * v.lengthSq);
    if (denominator === 0) return Math.PI / 2;
    return Math.acos(clamp(this.dot(v) / denominator, -1, 1));
  }

  /** Applies a 3x3 affine transform using homogeneous coordinate 1. */
  applyMatrix3(m: { elements: ArrayLike<number> }): this {
    const { x, y } = this;
    const e = m.elements;
    this.x = e[0] * x + e[3] * y + e[6];
    this.y = e[1] * x + e[4] * y + e[7];
    return this;
  }

  /** Returns the Euclidean distance from this vector to `v`. */
  distanceTo(v: Vector2): number {
    return Math.sqrt(this.distanceToSquared(v));
  }

  /** Returns the squared Euclidean distance from this vector to `v`. */
  distanceToSquared(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /** Returns the sum of absolute component differences from `v`. */
  manhattanDistanceTo(v: Vector2): number {
    return Math.abs(this.x - v.x) + Math.abs(this.y - v.y);
  }

  /** Returns the dot product with `v`. */
  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  /** Returns true when every stored component exactly matches the argument. */
  equals(v: Vector2): boolean {
    return this.x === v.x && this.y === v.y;
  }

  /** Reads this value's components from `array` starting at `offset`. */
  fromArray(array: ArrayLike<number>, offset: number = 0): this {
    this.x = array[offset];
    this.y = array[offset + 1];
    return this;
  }

  /** Reads x, y from an Attribute at the given vertex index. */
  fromBufferAttribute(attribute: Attribute, index: number): this {
    this.x = attribute.getX(index);
    this.y = attribute.getY(index);
    return this;
  }

  /** Euclidean magnitude of this value. */
  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** Rescales this vector to the supplied length. */
  set length(value: number) {
    this.normalize().multiplyScalar(value);
  }

  /** Squared Euclidean magnitude, avoiding a square root. */
  get lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** Sum of the absolute component values. */
  get manhattanLength(): number {
    return Math.abs(this.x) + Math.abs(this.y);
  }

  /** Linearly interpolates this value toward `v` by `alpha`. */
  lerp(v: Vector2, alpha: number): this {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    return this;
  }

  /** Linearly interpolates between two vectors and stores the result here. */
  lerpVectors(a: Vector2, b: Vector2, alpha: number): this {
    this.x = a.x + (b.x - a.x) * alpha;
    this.y = a.y + (b.y - a.y) * alpha;
    return this;
  }

  /** Clamps each component between the corresponding components of `min` and `max`. */
  clamp(min: Vector2, max: Vector2): this {
    this.x = clamp(this.x, min.x, max.x);
    this.y = clamp(this.y, min.y, max.y);
    return this;
  }

  /** Clamps every component to the inclusive scalar range [`min`, `max`]. */
  clampScalar(min: number, max: number): this {
    this.x = clamp(this.x, min, max);
    this.y = clamp(this.y, min, max);
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
    return this;
  }

  /** Rounds every component up to the nearest integer. */
  ceil(): this {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    return this;
  }

  /** Rounds every component to the nearest integer. */
  round(): this {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  }

  /** Truncates every component toward zero. */
  roundToZero(): this {
    this.x = Math.trunc(this.x);
    this.y = Math.trunc(this.y);
    return this;
  }

  /** Negates every component in place. */
  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  /** Multiplies components by the corresponding components of `v`. */
  multiply(v: Vector2): this {
    this.x *= v.x;
    this.y *= v.y;
    return this;
  }

  /** Stores the component-wise product `a × b` in this vector. */
  multiplyVectors(a: Vector2, b: Vector2): this {
    this.x = a.x * b.x;
    this.y = a.y * b.y;
    return this;
  }

  /** Divides components by the corresponding components of `v`. */
  divide(v: Vector2): this {
    this.x /= v.x;
    this.y /= v.y;
    return this;
  }

  /** Divides every component by `scalar` in place. */
  divideScalar(scalar: number): this {
    return this.multiplyScalar(1 / scalar);
  }

  /** Replaces each component with the larger value from this vector and `v`. */
  max(v: Vector2): this {
    this.x = Math.max(this.x, v.x);
    this.y = Math.max(this.y, v.y);
    return this;
  }

  /** Replaces each component with the smaller value from this vector and `v`. */
  min(v: Vector2): this {
    this.x = Math.min(this.x, v.x);
    this.y = Math.min(this.y, v.y);
    return this;
  }

  /** Multiplies every component by `scalar` in place. */
  multiplyScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
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
      default:
        throw new RangeError(`Vector2: index is out of range: ${index}`);
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
      default:
        throw new RangeError(`Vector2: index is out of range: ${index}`);
    }
  }

  /** Sets every component to `scalar`. */
  setScalar(scalar: number): this {
    this.x = scalar;
    this.y = scalar;
    return this;
  }

  /** Subtracts `scalar` from every component in place. */
  subScalar(scalar: number): this {
    this.x -= scalar;
    this.y -= scalar;
    return this;
  }

  /** Stores the component-wise difference of `a` and `b` in this vector. */
  subVectors(a: Vector2, b: Vector2): this {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    return this;
  }

  /** Rotates this point around `center` by `angle` radians. */
  rotateAround(center: Vector2, angle: number): this {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const x = this.x - center.x;
    const y = this.y - center.y;
    this.x = x * c - y * s + center.x;
    this.y = x * s + y * c + center.y;
    return this;
  }

  /** Replaces each component with an independent random value in [0, 1). */
  random(): this {
    this.x = Math.random();
    this.y = Math.random();
    return this;
  }

  /** Writes this value's components to `array` starting at `offset`. */
  toArray(array: number[] = [], offset: number = 0): number[] {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    return array;
  }

  /** Rescales this vector to unit length when its magnitude is non-zero. */
  normalize(): this {
    const len = this.length;
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  /** Replaces all stored components with the supplied values. */
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  /** Subtracts `v` component by component in place. */
  sub(v: Vector2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /** Truncates both components toward zero. */
  trunc(): this {
    this.x = Math.trunc(this.x);
    this.y = Math.trunc(this.y);
    return this;
  }

  /** Iterates over components in storage order. */
  *[Symbol.iterator](): Generator<number> {
    yield this.x;
    yield this.y;
  }
}
