import type { Attribute } from "../geometry/Attribute.ts";
import { Plane } from "./Plane.ts";
import { Vector3 } from "./Vector3.ts";

const _v0 = new Vector3();
const _v1 = new Vector3();
const _v2 = new Vector3();
const _v3 = new Vector3();
const _v4 = new Vector3();
const _v5 = new Vector3();

/** Computes barycentric coordinates of a point relative to a triangle. */
export function triangleBarycoord(
  point: Vector3,
  a: Vector3,
  b: Vector3,
  c: Vector3,
  target: Vector3 = new Vector3(),
): Vector3 | undefined {
  _v0.copy(c).sub(a);
  _v1.copy(b).sub(a);
  _v2.copy(point).sub(a);

  const dot00 = _v0.dot(_v0);
  const dot01 = _v0.dot(_v1);
  const dot02 = _v0.dot(_v2);
  const dot11 = _v1.dot(_v1);
  const dot12 = _v1.dot(_v2);
  const denominator = dot00 * dot11 - dot01 * dot01;
  if (denominator === 0) return;

  const inverseDenominator = 1 / denominator;
  const u = (dot11 * dot02 - dot01 * dot12) * inverseDenominator;
  const v = (dot00 * dot12 - dot01 * dot02) * inverseDenominator;
  return target.set(1 - u - v, v, u);
}

/** Returns true when `point` lies inside or on the triangle. */
export function triangleContainsPoint(
  point: Vector3,
  a: Vector3,
  b: Vector3,
  c: Vector3,
): boolean {
  const barycentric = triangleBarycoord(point, a, b, c, _v3);
  if (barycentric === undefined) return false;
  return (
    barycentric.x >= 0 &&
    barycentric.y >= 0 &&
    barycentric.x + barycentric.y <= 1
  );
}

/** Interpolates three vectors at `point`'s barycentric coordinates. */
export function interpolateTriangle(
  point: Vector3,
  a: Vector3,
  b: Vector3,
  c: Vector3,
  v1: Vector3,
  v2: Vector3,
  v3: Vector3,
  target: Vector3 = new Vector3(),
): Vector3 | undefined {
  const barycentric = triangleBarycoord(point, a, b, c, _v3);
  if (barycentric === undefined) return;
  target.x = v1.x * barycentric.x + v2.x * barycentric.y + v3.x * barycentric.z;
  target.y = v1.y * barycentric.x + v2.y * barycentric.y + v3.y * barycentric.z;
  target.z = v1.z * barycentric.x + v2.z * barycentric.y + v3.z * barycentric.z;
  return target;
}

/** Computes a normalized triangle normal. */
export function triangleNormal(
  a: Vector3,
  b: Vector3,
  c: Vector3,
  target: Vector3 = new Vector3(),
): Vector3 {
  target.copy(c).sub(b);
  _v0.copy(b).sub(a);
  target.cross(_v0);
  const lengthSquared = target.lengthSq;
  return lengthSquared > 0
    ? target.multiplyScalar(1 / Math.sqrt(lengthSquared))
    : target.set(0, 0, 0);
}

/** Tests whether a triangle faces a direction. */
export function isTriangleFrontFacing(
  a: Vector3,
  b: Vector3,
  c: Vector3,
  direction: Vector3,
): boolean {
  _v0.copy(c).sub(b);
  _v1.copy(a).sub(b);
  return _v0.cross(_v1).dot(direction) < 0;
}

/** Triangle defined by three 3D vertices. */
export class Triangle {
  readonly #a: Vector3 = new Vector3();
  readonly #b: Vector3 = new Vector3();
  readonly #c: Vector3 = new Vector3();

  /** Constructs a triangle from three vertex positions. */
  constructor(
    a: Vector3 = new Vector3(),
    b: Vector3 = new Vector3(),
    c: Vector3 = new Vector3(),
  ) {
    this.#a = a.clone();
    this.#b = b.clone();
    this.#c = c.clone();
  }

  /** First triangle vertex; the returned vector is live. */
  get a(): Vector3 {
    return this.#a;
  }

  /** Copies the first triangle vertex into the live `a` value. */
  set a(value: Vector3) {
    this.#a.copy(value);
  }

  /** Second triangle vertex; the returned vector is live. */
  get b(): Vector3 {
    return this.#b;
  }

  /** Copies the second triangle vertex into the live `b` value. */
  set b(value: Vector3) {
    this.#b.copy(value);
  }

  /** Third triangle vertex; the returned vector is live. */
  get c(): Vector3 {
    return this.#c;
  }

  /** Copies `value` into the third triangle vertex. */
  set c(value: Vector3) {
    this.#c.copy(value);
  }

  /** Replaces all stored components with the supplied values. */
  set(a: Vector3, b: Vector3, c: Vector3): this {
    this.#a.copy(a);
    this.#b.copy(b);
    this.#c.copy(c);
    return this;
  }

  /** Returns a new instance with the same component values. */
  clone(): Triangle {
    return new Triangle(this.#a, this.#b, this.#c);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(triangle: Triangle): this {
    this.#a.copy(triangle.a);
    this.#b.copy(triangle.b);
    this.#c.copy(triangle.c);
    return this;
  }

  /** Area of the triangle in squared world units. */
  get area(): number {
    _v0.copy(this.#c).sub(this.#b);
    _v1.copy(this.#b).sub(this.#a);
    return _v0.cross(_v1).length * 0.5;
  }

  /** Computes barycentric coordinates for `point`, or undefined for a degenerate triangle. */
  getBarycoord(
    point: Vector3,
    target: Vector3 = new Vector3(),
  ): Vector3 | undefined {
    return triangleBarycoord(point, this.#a, this.#b, this.#c, target);
  }

  /** Returns true when `point` lies inside or on the triangle. */
  containsPoint(point: Vector3): boolean {
    return triangleContainsPoint(point, this.#a, this.#b, this.#c);
  }

  /** Writes the closest point on this triangle to `point` into `target`. */
  closestPointToPoint(
    point: Vector3,
    target: Vector3 = new Vector3(),
  ): Vector3 {
    const a = this.#a;
    const b = this.#b;
    const c = this.#c;
    const ab = _v0.copy(b).sub(a);
    const ac = _v1.copy(c).sub(a);
    const ap = _v2.copy(point).sub(a);
    const d1 = ab.dot(ap);
    const d2 = ac.dot(ap);
    if (d1 <= 0 && d2 <= 0) return target.copy(a);

    const bp = _v3.copy(point).sub(b);
    const d3 = ab.dot(bp);
    const d4 = ac.dot(bp);
    if (d3 >= 0 && d4 <= d3) return target.copy(b);

    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
      return target.copy(a).addScaledVector(ab, d1 / (d1 - d3));
    }

    const cp = _v4.copy(point).sub(c);
    const d5 = ab.dot(cp);
    const d6 = ac.dot(cp);
    if (d6 >= 0 && d5 <= d6) return target.copy(c);

    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
      return target.copy(a).addScaledVector(ac, d2 / (d2 - d6));
    }

    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && d4 >= d3 && d5 >= d6) {
      const bc = _v5.copy(c).sub(b);
      const weight = (d4 - d3) / (d4 - d3 + d5 - d6);
      return target.copy(b).addScaledVector(bc, weight);
    }

    const inverseDenominator = 1 / (va + vb + vc);
    return target
      .copy(a)
      .addScaledVector(ab, vb * inverseDenominator)
      .addScaledVector(ac, vc * inverseDenominator);
  }

  /** Sets the triangle vertices from an `Attribute` at the given vertex indices. */
  setFromAttributeAndIndices(
    attribute: Attribute,
    i0: number,
    i1: number,
    i2: number,
  ): this {
    this.#a.set(attribute.getX(i0), attribute.getY(i0), attribute.getZ(i0));
    this.#b.set(attribute.getX(i1), attribute.getY(i1), attribute.getZ(i1));
    this.#c.set(attribute.getX(i2), attribute.getY(i2), attribute.getZ(i2));
    return this;
  }

  /** Sets the triangle from three points and their index labels. */
  setFromPointsAndIndices(
    p0: Vector3,
    p1: Vector3,
    p2: Vector3,
    _i0: number,
    _i1: number,
    _i2: number,
  ): this {
    this.#a.copy(p0);
    this.#b.copy(p1);
    this.#c.copy(p2);
    return this;
  }

  /** Returns true when every stored component exactly matches the argument. */
  equals(triangle: Triangle): boolean {
    return (
      triangle.a.equals(this.#a) &&
      triangle.b.equals(this.#b) &&
      triangle.c.equals(this.#c)
    );
  }

  /** Interpolates `v1`, `v2`, and `v3` at `point`'s barycentric coordinates. */
  getInterpolation(
    point: Vector3,
    v1: Vector3,
    v2: Vector3,
    v3: Vector3,
    target: Vector3 = new Vector3(),
  ): Vector3 | undefined {
    return interpolateTriangle(
      point,
      this.#a,
      this.#b,
      this.#c,
      v1,
      v2,
      v3,
      target,
    );
  }

  /** Interpolates an attribute across the triangle using barycentric coordinates. */
  getInterpolatedAttribute(
    attr: Attribute,
    i1: number,
    i2: number,
    i3: number,
    barycoord: Vector3,
    target: Vector3,
  ): Vector3 {
    target.x =
      attr.getX(i1) * barycoord.x +
      attr.getX(i2) * barycoord.y +
      attr.getX(i3) * barycoord.z;
    target.y =
      attr.getY(i1) * barycoord.x +
      attr.getY(i2) * barycoord.y +
      attr.getY(i3) * barycoord.z;
    target.z =
      attr.getZ(i1) * barycoord.x +
      attr.getZ(i2) * barycoord.y +
      attr.getZ(i3) * barycoord.z;
    return target;
  }

  /** Writes the triangle centroid into `target`. */
  getMidpoint(target: Vector3 = new Vector3()): Vector3 {
    return target
      .copy(this.#a)
      .add(this.#b)
      .add(this.#c)
      .multiplyScalar(1 / 3);
  }

  /** Writes the normalized face normal into `target`. */
  getNormal(target: Vector3 = new Vector3()): Vector3 {
    return triangleNormal(this.#a, this.#b, this.#c, target);
  }

  /** Writes the plane containing this triangle into `target`. */
  getPlane(target: Plane = new Plane()): Plane {
    return target.setFromCoplanarPoints(this.#a, this.#b, this.#c);
  }

  /** Returns true when `box` overlaps this triangle. */
  intersectsBox(box: {
    min: Vector3;
    max: Vector3;
    intersectsTriangle?: (tri: Triangle) => boolean;
  }): boolean {
    return box.intersectsTriangle ? box.intersectsTriangle(this) : false;
  }

  /** Returns true when the triangle faces `direction`. */
  isFrontFacing(direction: Vector3): boolean {
    return isTriangleFrontFacing(this.#a, this.#b, this.#c, direction);
  }
}
