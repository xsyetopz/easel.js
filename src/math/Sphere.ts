import type { Box3 } from "./Box3.ts";
import type { Matrix4 } from "./Matrix4.ts";
import type { Plane } from "./Plane.ts";
import { Vector3 } from "./Vector3.ts";

type SphereLike =
  | { readonly centre: Vector3; readonly radius: number }
  | { readonly center: Vector3; readonly radius: number };

/** Bounding sphere defined by center and radius. */
export class Sphere {
  /** Type marker identifying Sphere instances. */
  readonly isSphere = true;

  readonly #centre: Vector3 = new Vector3();
  #radius = 1;

  /** Constructs a bounding sphere from a center and radius. */
  constructor(centre: Vector3 = new Vector3(), radius: number = 1) {
    this.#centre = centre.clone();
    this.#radius = radius;
  }

  /** Sphere center; the returned vector is live. */
  get centre(): Vector3 {
    return this.#centre;
  }

  /** Copies `value` into the sphere center. */
  set centre(value: Vector3) {
    this.#centre.copy(value);
  }

  /** THREE.js-compatible American spelling for the sphere center. */
  get center(): Vector3 {
    return this.#centre;
  }

  /** Copies `value` into the sphere center. */
  set center(value: Vector3) {
    this.#centre.copy(value);
  }

  /** Radius of the primitive in world units. */
  get radius(): number {
    return this.#radius;
  }

  /** Replaces the primitive radius in world units. */
  set radius(value: number) {
    this.#radius = value;
  }

  /** A sphere with a negative radius encloses no points. */
  get isEmpty(): boolean {
    return this.#radius < 0;
  }

  /** Replaces all stored components with the supplied values. */
  set(center: Vector3, radius: number): this {
    this.#centre.copy(center);
    this.#radius = radius;
    return this;
  }

  /** Resets the center and radius to the empty-sphere sentinel. */
  makeEmpty(): this {
    this.#centre.set(0, 0, 0);
    this.#radius = -1;
    return this;
  }

  /** Returns a new instance with the same component values. */
  clone(): Sphere {
    return new Sphere(this.centre, this.radius);
  }

  /** Returns true when `point` lies inside or on the sphere. */
  containsPoint(point: Vector3): boolean {
    return point.clone().sub(this.centre).lengthSq <= this.radius * this.radius;
  }

  /** Copies component values from the supplied instance into this one. */
  copy(sphere: Sphere): Sphere {
    this.centre.copy(sphere.centre);
    this.radius = sphere.radius;
    return this;
  }

  /** Returns signed distance from the sphere surface to `point`. */
  distanceToPoint(point: Vector3): number {
    return point.clone().sub(this.centre).length - this.radius;
  }

  /** Returns true when every stored component exactly matches the argument. */
  equals(sphere: Sphere): boolean {
    return (
      sphere.centre.x === this.centre.x &&
      sphere.centre.y === this.centre.y &&
      sphere.centre.z === this.centre.z &&
      sphere.radius === this.radius
    );
  }

  /** Returns true when `sphere` overlaps this sphere. */
  intersectsSphere(sphere: SphereLike): boolean {
    const r = this.radius + sphere.radius;
    const center = "centre" in sphere ? sphere.centre : sphere.center;
    return this.centre.distanceToSquared(center) <= r * r;
  }

  /** Returns true when `box` overlaps this sphere. */
  intersectsBox(box: Box3): boolean {
    return box.intersectsSphere(this);
  }

  /** Returns true when `plane` crosses or touches this sphere. */
  intersectsPlane(plane: Pick<Plane, "distanceToPoint">): boolean {
    return Math.abs(plane.distanceToPoint(this.#centre)) <= this.#radius;
  }

  /** Clamps a point to the sphere surface, writing into the supplied target. */
  clampPoint(point: Vector3, target: Vector3): Vector3 {
    if (this.isEmpty) return target.copy(point);

    const dx = point.x - this.#centre.x;
    const dy = point.y - this.#centre.y;
    const dz = point.z - this.#centre.z;
    const distanceSq = dx * dx + dy * dy + dz * dz;
    const radiusSq = this.#radius * this.#radius;
    if (distanceSq <= radiusSq) return target.copy(point);

    const distance = Math.sqrt(distanceSq);
    if (distance === 0) return target.copy(this.#centre);
    const scale = this.#radius / distance;
    return target.set(
      this.#centre.x + dx * scale,
      this.#centre.y + dy * scale,
      this.#centre.z + dz * scale,
    );
  }

  /** Writes the axis-aligned bounding box into `target`. */
  getBoundingBox(target: Box3): Box3 {
    if (this.isEmpty) return target.makeEmpty();

    target.min.copy(this.#centre);
    target.max.copy(this.#centre);
    target.expandByScalar(this.#radius);
    return target;
  }

  /** Applies a 4x4 transform in place and returns this instance. */
  applyMatrix4(matrix: Matrix4): this {
    this.#centre.applyMatrix4(matrix);

    // The radius is scaled by the largest basis-vector length, matching the
    // conservative sphere bound used by THREE.js without requiring a matrix
    // helper in the hot path.
    const elements = matrix.elements;
    const scaleX = Math.hypot(elements[0], elements[1], elements[2]);
    const scaleY = Math.hypot(elements[4], elements[5], elements[6]);
    const scaleZ = Math.hypot(elements[8], elements[9], elements[10]);
    this.#radius *= Math.max(scaleX, scaleY, scaleZ);
    return this;
  }

  /** Translates the sphere center by `offset` in place. */
  translate(offset: Vector3): Sphere {
    this.centre.add(offset);
    return this;
  }

  /**
   * Sets this sphere to tightly bound the given points. If optionalCenter is
   * provided it is used as the sphere centre; otherwise the centroid is used.
   */
  setFromPoints(points: Vector3[], optionalCenter?: Vector3): this {
    const center = this.centre;
    if (optionalCenter) {
      center.copy(optionalCenter);
    } else {
      center.set(0, 0, 0);
      for (const p of points) {
        center.add(p);
      }
      if (points.length > 0) {
        center.multiplyScalar(1 / points.length);
      }
    }
    let maxRadiusSq = 0;
    for (const p of points) {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      const dz = p.z - center.z;
      maxRadiusSq = Math.max(maxRadiusSq, dx * dx + dy * dy + dz * dz);
    }
    this.radius = Math.sqrt(maxRadiusSq);
    return this;
  }

  /**
   * Expands the sphere radius to include the given point if it lies outside.
   * The centre is not moved.
   */
  expandByPoint(point: Vector3): this {
    const dx = point.x - this.centre.x;
    const dy = point.y - this.centre.y;
    const dz = point.z - this.centre.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq > this.radius * this.radius) {
      this.radius = Math.sqrt(distSq);
    }
    return this;
  }

  /** Expands this sphere to enclose both spheres. */
  union(sphere: Sphere): this {
    if (sphere.isEmpty) return this;
    if (this.isEmpty) {
      this.copy(sphere);
      return this;
    }

    const dx = sphere.#centre.x - this.#centre.x;
    const dy = sphere.#centre.y - this.#centre.y;
    const dz = sphere.#centre.z - this.#centre.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance === 0) {
      this.#radius = Math.max(this.#radius, sphere.#radius);
      return this;
    }

    if (distance + sphere.#radius <= this.#radius) return this;
    if (distance + this.#radius <= sphere.#radius) {
      this.copy(sphere);
      return this;
    }

    const radius = (distance + this.#radius + sphere.#radius) * 0.5;
    const shift = (radius - this.#radius) / distance;
    this.#centre.x += dx * shift;
    this.#centre.y += dy * shift;
    this.#centre.z += dz * shift;
    this.#radius = radius;
    return this;
  }

  /** Serializes this value into its JSON representation. */
  toJSON(): { radius: number; center: [number, number, number] } {
    return {
      radius: this.#radius,
      center: [this.#centre.x, this.#centre.y, this.#centre.z],
    };
  }

  /** Restores this value from its serialized JSON representation. */
  fromJSON(json: { radius: number; center: ArrayLike<number> }): this {
    this.#radius = json.radius;
    this.#centre.set(json.center[0], json.center[1], json.center[2]);
    return this;
  }
}
