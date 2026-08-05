import type { Box3 } from "./Box3.ts";
import type { Line3 } from "./Line3.ts";
import { Matrix3 } from "./Matrix3.ts";
import type { Matrix4 } from "./Matrix4.ts";
import { Vector3 } from "./Vector3.ts";

type SphereLike =
  | { readonly centre: Vector3; readonly radius: number }
  | { readonly center: Vector3; readonly radius: number };

/** Infinite plane defined by a unit normal and signed distance. */
export class Plane {
  /** Type marker identifying Plane instances. */
  readonly isPlane = true;

  readonly #normal: Vector3 = new Vector3(1, 0, 0);
  #constant = 0;

  /** Constructs a plane from a normal and signed offset. */
  constructor(normal: Vector3 = new Vector3(1, 0, 0), constant: number = 0) {
    const length = normal.length;
    this.#normal = normal.clone().normalize();
    this.#constant = constant / length;
  }

  /** Plane normal; the returned vector is live and normally unit length. */
  get normal(): Vector3 {
    return this.#normal;
  }

  /** Copies and normalizes `value` as the plane normal. */
  set normal(value: Vector3) {
    this.#normal.copy(value).normalize();
  }

  /** Signed plane offset in the equation n·p + constant = 0. */
  get constant(): number {
    return this.#constant;
  }

  /** Replaces the signed plane offset. */
  set constant(value: number) {
    this.#constant = value;
  }

  /** Copies `normal` and `constant` into this plane. */
  set(normal: Vector3, constant: number): this {
    this.#normal.copy(normal);
    this.#constant = constant;
    return this;
  }

  /** Applies a 4x4 transform in place and returns this instance. */
  applyMatrix4(m: Matrix4): Plane {
    const normalMatrix = new Matrix3().getNormalMatrix(m);
    const referencePoint = this.coplanarPoint(new Vector3()).applyMatrix4(m);
    this.normal.applyMatrix3(normalMatrix).normalize();
    this.constant = -referencePoint.dot(this.normal);
    return this;
  }

  /** Writes any point on this plane into `target`. */
  coplanarPoint(target: Vector3 = new Vector3()): Vector3 {
    return target.copy(this.normal).multiplyScalar(-this.constant);
  }

  /** Returns a new instance with the same component values. */
  clone(): Plane {
    return new Plane(this.normal, this.constant);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(plane: Plane): Plane {
    this.normal.copy(plane.normal);
    this.constant = plane.constant;
    return this;
  }

  /** Returns the signed distance from the plane to `point`. */
  distanceToPoint(point: { x: number; y: number; z: number }): number {
    return this.normal.dot(point) + this.constant;
  }

  /** Returns true when every stored component exactly matches the argument. */
  equals(plane: Plane): boolean {
    return plane.normal.equals(this.normal) && plane.constant === this.constant;
  }

  /** Returns the segment hit point, or undefined when there is no hit. */
  intersectLine(
    line: { start: Vector3; end: Vector3 },
    target: Vector3 = new Vector3(),
  ): Vector3 | undefined {
    const dir = line.end.sub(line.start);
    const denom = this.normal.dot(dir);
    if (denom === 0) {
      return this.distanceToPoint(line.start) === 0
        ? target.copy(line.start)
        : undefined;
    }
    const t = -(line.start.dot(this.normal) + this.constant) / denom;
    if (t < 0 || t > 1) return;
    return target.copy(dir).multiplyScalar(t).add(line.start);
  }

  /** Returns signed distance from the plane to the sphere surface. */
  distanceToSphere(sphere: SphereLike): number {
    const center = "centre" in sphere ? sphere.centre : sphere.center;
    return this.distanceToPoint(center) - sphere.radius;
  }

  /** Returns true when `sphere` crosses or touches this plane. */
  intersectsSphere(sphere: SphereLike): boolean {
    const center = "centre" in sphere ? sphere.centre : sphere.center;
    return Math.abs(this.distanceToPoint(center)) <= sphere.radius;
  }

  /** Returns true when `box` crosses or touches this plane. */
  intersectsBox(box: Box3): boolean {
    const { min, max } = box;
    const minX = this.#normal.x >= 0 ? min.x : max.x;
    const minY = this.#normal.y >= 0 ? min.y : max.y;
    const minZ = this.#normal.z >= 0 ? min.z : max.z;
    const maxX = this.#normal.x >= 0 ? max.x : min.x;
    const maxY = this.#normal.y >= 0 ? max.y : min.y;
    const maxZ = this.#normal.z >= 0 ? max.z : min.z;

    const minDistance =
      this.#normal.x * minX +
      this.#normal.y * minY +
      this.#normal.z * minZ +
      this.#constant;
    const maxDistance =
      this.#normal.x * maxX +
      this.#normal.y * maxY +
      this.#normal.z * maxZ +
      this.#constant;
    return minDistance <= 0 && maxDistance >= 0;
  }

  /** Returns true when the segment crosses the plane. */
  intersectsLine(line: Line3): boolean {
    const startSign = this.distanceToPoint(line.start);
    const endSign = this.distanceToPoint(line.end);
    return (startSign < 0 && endSign > 0) || (endSign < 0 && startSign > 0);
  }

  /** Negates every component in place. */
  negate(): this {
    this.#normal.negate();
    this.#constant = -this.#constant;
    return this;
  }

  /** Projects `point` orthogonally onto this plane and writes `target`. */
  projectPoint(point: Vector3, target: Vector3 = new Vector3()): Vector3 {
    return target
      .copy(this.normal)
      .multiplyScalar(-this.distanceToPoint(point))
      .add(point);
  }

  /** Replaces the plane normal and signed offset components. */
  setComponents(x: number, y: number, z: number, w: number): Plane {
    this.normal.set(x, y, z);
    this.constant = w;
    return this;
  }

  /** Replaces this plane from three coplanar points. */
  setFromCoplanarPoints(a: Vector3, b: Vector3, c: Vector3): Plane {
    const v1 = b.clone().sub(a);
    const v2 = c.clone().sub(a);
    const normal = v1.clone().cross(v2).normalize();
    this.setFromNormalAndCoplanarPoint(normal, a);
    return this;
  }

  /** Replaces this plane from a normal and point on the plane. */
  setFromNormalAndCoplanarPoint(normal: Vector3, point: Vector3): Plane {
    this.normal.copy(normal).normalize();
    this.constant = -point.clone().dot(this.normal);
    return this;
  }

  /** Translates the plane by `offset` in place. */
  translate(offset: Vector3): Plane {
    this.constant -= offset.dot(this.normal);
    return this;
  }

  /** Normalizes the plane equation so the normal has unit length. */
  normalize(): Plane {
    const length = this.normal.length;
    this.normal.divideScalar(length);
    this.constant /= length;
    return this;
  }
}
