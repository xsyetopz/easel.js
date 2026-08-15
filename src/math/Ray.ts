import { Vector3 } from "./Vector3.ts";

const _v1 = new Vector3();
const _v2 = new Vector3();
const _v3 = new Vector3();
const _diff = new Vector3();
const _edge1 = new Vector3();
const _edge2 = new Vector3();
const _normal = new Vector3();

/** Handles the non-negative ray parameter branch of ray-segment distance. */
function _segS0NonNeg(
  s0In: number,
  s1In: number,
  extDet: number,
  segExtent: number,
  a01: number,
  b0: number,
  b1: number,
  det: number,
  c: number,
): { s0: number; s1: number; sqrDist: number } {
  let s0 = s0In;
  let s1 = s1In;
  let sqrDist: number;
  if (s1 >= -extDet) {
    if (s1 <= extDet) {
      const invDet = 1 / det;
      s0 *= invDet;
      s1 *= invDet;
      sqrDist =
        s0 * (s0 + a01 * s1 + 2 * b0) + s1 * (a01 * s0 + s1 + 2 * b1) + c;
    } else {
      s1 = segExtent;
      s0 = Math.max(0, -(a01 * s1 + b0));
      sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
    }
  } else {
    s1 = -segExtent;
    s0 = Math.max(0, -(a01 * s1 + b0));
    sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
  }
  return { s0, s1, sqrDist };
}

/** Handles the non-parallel ray-segment distance branch. */
function _segDetNonZero(
  s0In: number,
  s1In: number,
  extDet: number,
  segExtent: number,
  a01: number,
  b0: number,
  b1: number,
  det: number,
  c: number,
): { s0: number; s1: number; sqrDist: number } {
  let s0 = s0In;
  let s1 = s1In;
  let sqrDist: number;
  if (s0 >= 0) {
    return _segS0NonNeg(s0, s1, extDet, segExtent, a01, b0, b1, det, c);
  }
  if (s1 <= -extDet) {
    s0 = Math.max(0, -(-a01 * segExtent + b0));
    s1 = s0 > 0 ? -segExtent : Math.min(Math.max(-segExtent, -b1), segExtent);
    sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
  } else if (s1 <= extDet) {
    s0 = 0;
    s1 = Math.min(Math.max(-segExtent, -b1), segExtent);
    sqrDist = s1 * (s1 + 2 * b1) + c;
  } else {
    s0 = Math.max(0, -(a01 * segExtent + b0));
    s1 = s0 > 0 ? segExtent : Math.min(Math.max(-segExtent, -b1), segExtent);
    sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
  }
  return { s0, s1, sqrDist };
}

/**
 * Returns the first non-negative parameter where a ray enters an AABB.
 *
 * The slab interval is kept entirely in scalar locals.  In particular, this
 * helper must not return a `{ lo, hi }` record for each axis: a ray-box query
 * is commonly used for every pick candidate, and those short-lived records
 * would add avoidable garbage to the CPU path.  NaN updates match the
 * conventional THREE.js behavior when a zero direction component starts on a
 * box boundary (`0 * Infinity`).
 */
function _boxIntersectionT(
  box: { min: Vector3; max: Vector3 },
  origin: Vector3,
  direction: Vector3,
): number | undefined {
  const invdirx = 1 / direction.x;
  const invdiry = 1 / direction.y;
  const invdirz = 1 / direction.z;

  let tmin: number;
  let tmax: number;
  if (invdirx >= 0) {
    tmin = (box.min.x - origin.x) * invdirx;
    tmax = (box.max.x - origin.x) * invdirx;
  } else {
    tmin = (box.max.x - origin.x) * invdirx;
    tmax = (box.min.x - origin.x) * invdirx;
  }

  let tymin: number;
  let tymax: number;
  if (invdiry >= 0) {
    tymin = (box.min.y - origin.y) * invdiry;
    tymax = (box.max.y - origin.y) * invdiry;
  } else {
    tymin = (box.max.y - origin.y) * invdiry;
    tymax = (box.min.y - origin.y) * invdiry;
  }

  if (tmin > tymax || tymin > tmax) return;
  if (tymin > tmin || Number.isNaN(tmin)) tmin = tymin;
  if (tymax < tmax || Number.isNaN(tmax)) tmax = tymax;

  let tzmin: number;
  let tzmax: number;
  if (invdirz >= 0) {
    tzmin = (box.min.z - origin.z) * invdirz;
    tzmax = (box.max.z - origin.z) * invdirz;
  } else {
    tzmin = (box.max.z - origin.z) * invdirz;
    tzmax = (box.min.z - origin.z) * invdirz;
  }

  if (tmin > tzmax || tzmin > tmax) return;
  if (tzmin > tmin || Number.isNaN(tmin)) tmin = tzmin;
  if (tzmax < tmax || Number.isNaN(tmax)) tmax = tzmax;

  if (tmax < 0) return;
  return tmin >= 0 ? tmin : tmax;
}

/** Ray defined by an origin point and direction vector. */
export class Ray {
  readonly #origin: Vector3 = new Vector3(0, 0, 0);
  readonly #direction: Vector3 = new Vector3(0, 0, -1);

  /** Constructs a ray from an origin and direction. */
  constructor(
    origin: Vector3 = new Vector3(0, 0, 0),
    direction: Vector3 = new Vector3(0, 0, -1),
  ) {
    this.#origin = origin.clone();
    this.#direction = direction.clone();
  }

  /** Ray origin in world coordinates; the returned vector is live. */
  get origin(): Vector3 {
    return this.#origin;
  }

  /** Copies `value` into the ray origin. */
  set origin(value: Vector3) {
    this.#origin.copy(value);
  }

  /** Ray direction; callers normally provide a normalized vector. */
  get direction(): Vector3 {
    return this.#direction;
  }

  /** Copies `value` into the ray direction. */
  set direction(value: Vector3) {
    this.#direction.copy(value);
  }

  /** Replaces all stored components with the supplied values. */
  set(origin: Vector3, direction: Vector3): this {
    this.#origin.copy(origin);
    this.#direction.copy(direction);
    return this;
  }

  /** Returns a new instance with the same component values. */
  clone(): Ray {
    return new Ray(this.#origin, this.#direction);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(ray: Ray): this {
    this.#origin.copy(ray.origin);
    this.#direction.copy(ray.direction);
    return this;
  }

  /** Returns the point at parameter t along the ray. */
  at(t: number, target: Vector3 = new Vector3()): Vector3 {
    return target.copy(this.#direction).multiplyScalar(t).add(this.#origin);
  }

  /** Replaces the direction with the normalized vector from the origin to `v`. */
  lookAt(v: Vector3): this {
    this.#direction.copy(v).sub(this.#origin).normalize();
    return this;
  }

  /** Moves the origin to the point at ray parameter `t`. */
  recast(t: number): this {
    this.#origin.copy(this.at(t, _v1));
    return this;
  }

  /** Writes the closest point on this ray to `point` into `target`. */
  closestPointToPoint(
    point: Vector3,
    target: Vector3 = new Vector3(),
  ): Vector3 {
    target.copy(point).sub(this.#origin);
    const dirDist = target.dot(this.#direction);
    if (dirDist < 0) return target.copy(this.#origin);
    return target
      .copy(this.#direction)
      .multiplyScalar(dirDist)
      .add(this.#origin);
  }

  /** Returns the Euclidean distance from this ray to `point`. */
  distanceToPoint(point: Vector3): number {
    return Math.sqrt(this.distanceSqToPoint(point));
  }

  /** Returns the squared distance from the ray to `point`. */
  distanceSqToPoint(point: Vector3): number {
    const dirDist = _v1.copy(point).sub(this.#origin).dot(this.#direction);
    if (dirDist < 0) return this.#origin.distanceToSquared(point);
    _v1.copy(this.#direction).multiplyScalar(dirDist).add(this.#origin);
    return _v1.distanceToSquared(point);
  }

  /** Returns the squared distance to segment `[v0, v1]` and optionally writes both closest points. */
  distanceSqToSegment(
    v0: Vector3,
    v1: Vector3,
    optionalPointOnRay?: Vector3,
    optionalPointOnSegment?: Vector3,
  ): number {
    const segCenter = _v1.copy(v0).add(v1).multiplyScalar(0.5);
    const segDir = _v2.copy(v1).sub(v0).normalize();
    const diff = _v3.copy(this.#origin).sub(segCenter);

    const segExtent = v0.distanceTo(v1) * 0.5;
    const a01 = -this.#direction.dot(segDir);
    const b0 = diff.dot(this.#direction);
    const b1 = -diff.dot(segDir);
    const c = diff.dot(diff);
    const det = Math.abs(1 - a01 * a01);

    let s0: number;
    let s1: number;
    let sqrDist: number;

    if (det > 0) {
      const s0raw = a01 * b1 - b0;
      const s1raw = a01 * b0 - b1;
      const extDet = segExtent * det;
      const result = _segDetNonZero(
        s0raw,
        s1raw,
        extDet,
        segExtent,
        a01,
        b0,
        b1,
        det,
        c,
      );
      s0 = result.s0;
      s1 = result.s1;
      sqrDist = result.sqrDist;
    } else {
      s1 = a01 > 0 ? -segExtent : segExtent;
      s0 = Math.max(0, -(a01 * s1 + b0));
      sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
    }

    if (optionalPointOnRay) {
      optionalPointOnRay
        .copy(this.#direction)
        .multiplyScalar(s0)
        .add(this.#origin);
    }
    if (optionalPointOnSegment) {
      optionalPointOnSegment.copy(segDir).multiplyScalar(s1).add(segCenter);
    }

    return sqrDist;
  }

  /** Returns the first forward ray hit on the sphere, or undefined. */
  intersectSphere(
    sphere: { centre: Vector3; radius: number },
    target: Vector3 = new Vector3(),
  ): Vector3 | undefined {
    _v1.copy(sphere.centre).sub(this.#origin);
    const tca = _v1.dot(this.#direction);
    const d2 = _v1.dot(_v1) - tca * tca;
    const r2 = sphere.radius * sphere.radius;
    if (d2 > r2) return;
    const thc = Math.sqrt(r2 - d2);
    const t0 = tca - thc;
    const t1 = tca + thc;
    if (t1 < 0) return;
    return this.at(t0 >= 0 ? t0 : t1, target);
  }

  /** Returns true when the ray passes within `sphere.radius` of its center. */
  intersectsSphere(sphere: { centre: Vector3; radius: number }): boolean {
    return (
      this.distanceSqToPoint(sphere.centre) <= sphere.radius * sphere.radius
    );
  }

  /** Returns the forward ray hit on the plane, or undefined. */
  intersectPlane(
    plane: { normal: Vector3; constant: number },
    target: Vector3 = new Vector3(),
  ): Vector3 | undefined {
    const t = this.distanceToPlane(plane);
    if (t === undefined) return;
    return this.at(t, target);
  }

  /** Returns true when the ray has a forward hit on `plane`. */
  intersectsPlane(plane: { normal: Vector3; constant: number }): boolean {
    const distToPoint = plane.normal.dot(this.#origin) + plane.constant;
    if (distToPoint === 0) return true;
    const denominator = plane.normal.dot(this.#direction);
    return denominator * distToPoint < 0;
  }

  /** Returns the non-negative ray parameter at the plane hit, or undefined. */
  distanceToPlane(plane: {
    normal: Vector3;
    constant: number;
  }): number | undefined {
    const denominator = plane.normal.dot(this.#direction);
    if (denominator === 0) {
      if (plane.normal.dot(this.#origin) + plane.constant === 0) return 0;
      return;
    }
    const t = -(this.#origin.dot(plane.normal) + plane.constant) / denominator;
    return t >= 0 ? t : undefined;
  }

  /** Returns the forward ray hit on the box, or undefined. */
  intersectBox(
    box: { min: Vector3; max: Vector3 },
    target: Vector3,
  ): Vector3 | undefined {
    const t = _boxIntersectionT(box, this.#origin, this.#direction);
    return t === undefined ? undefined : this.at(t, target);
  }

  /** Returns true when the ray has a forward hit on `box`. */
  intersectsBox(box: { min: Vector3; max: Vector3 }): boolean {
    return _boxIntersectionT(box, this.#origin, this.#direction) !== undefined;
  }

  /** Returns the forward hit on the triangle using Möller–Trumbore, or undefined. */
  intersectTriangle(
    a: Vector3,
    b: Vector3,
    c: Vector3,
    backfaceCulling: boolean,
    target: Vector3 = new Vector3(),
  ): Vector3 | undefined {
    _edge1.copy(b).sub(a);
    _edge2.copy(c).sub(a);
    _normal.copy(_edge1).cross(_edge2);

    let DdN = this.#direction.dot(_normal);
    let sign: number;
    if (DdN > 0) {
      if (backfaceCulling) return;
      sign = 1;
    } else if (DdN < 0) {
      sign = -1;
      DdN = -DdN;
    } else {
      return;
    }

    _diff.copy(this.#origin).sub(a);

    _v1.copy(_diff).cross(_edge2);
    const DdQxE2 = sign * this.#direction.dot(_v1);
    if (DdQxE2 < 0) return;

    _v2.copy(_edge1).cross(_diff);
    const DdE1xQ = sign * this.#direction.dot(_v2);
    if (DdE1xQ < 0) return;
    if (DdQxE2 + DdE1xQ > DdN) return;

    const QdN = -sign * _diff.dot(_normal);
    if (QdN < 0) return;

    return this.at(QdN / DdN, target);
  }

  /** Applies a 4x4 transform in place and returns this instance. */
  applyMatrix4(matrix4: { elements: ArrayLike<number> }): this {
    this.#direction.add(this.#origin);
    this.#origin.applyMatrix4(matrix4);
    this.#direction.applyMatrix4(matrix4);
    this.#direction.sub(this.#origin).normalize();
    return this;
  }

  /** Returns true when every stored component exactly matches the argument. */
  equals(ray: Ray): boolean {
    return (
      ray.origin.equals(this.#origin) && ray.direction.equals(this.#direction)
    );
  }
}
