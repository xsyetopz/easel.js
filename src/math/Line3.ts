import { clamp } from "./MathUtils.ts";
import type { Matrix4 } from "./Matrix4.ts";
import { Vector3 } from "./Vector3.ts";

/** Finite line segment between two 3D points. */
export class Line3 {
  readonly #start: Vector3 = new Vector3();
  readonly #end: Vector3 = new Vector3();

  /** Constructs a line segment from two 3D endpoints. */
  constructor(start: Vector3 = new Vector3(), end: Vector3 = new Vector3()) {
    this.#start = start.clone();
    this.#end = end.clone();
  }

  /** First endpoint of the segment; the returned vector is live. */
  get start(): Vector3 {
    return this.#start;
  }

  /** Copies `value` into the first endpoint. */
  set start(value: Vector3) {
    this.#start.copy(value);
  }

  /** Second endpoint of the segment; the returned vector is live. */
  get end(): Vector3 {
    return this.#end;
  }

  /** Copies `value` into the second endpoint. */
  set end(value: Vector3) {
    this.#end.copy(value);
  }

  /** Difference from the start endpoint to the end endpoint. */
  get delta(): Vector3 {
    return this.#end.clone().sub(this.#start);
  }

  /** Euclidean magnitude of this value. */
  get length(): number {
    return this.#start.distanceTo(this.#end);
  }

  /** Squared Euclidean magnitude, avoiding a square root. */
  get lengthSq(): number {
    return this.#start.distanceToSquared(this.#end);
  }

  /** Applies a 4x4 transform in place and returns this instance. */
  applyMatrix4(m: Matrix4): Line3 {
    this.#start.applyMatrix4(m);
    this.#end.applyMatrix4(m);
    return this;
  }

  /** Writes the point at segment parameter `t` into `target`. */
  at(t: number, target: Vector3 = new Vector3()): Vector3 {
    return target.copy(this.delta).multiplyScalar(t).add(this.#start);
  }

  /** Returns a new instance with the same component values. */
  clone(): Line3 {
    return new Line3(this.#start, this.#end);
  }

  /** Writes the closest point on this segment to `point` into `target`. */
  closestPointToPoint(
    point: Vector3,
    clampToLine: boolean = true,
    target: Vector3 = new Vector3(),
  ): Vector3 {
    const t = this.closestPointToPointParameter(point, clampToLine);
    return this.at(t, target);
  }

  /** Returns the segment parameter of the closest point to `point`. */
  closestPointToPointParameter(
    point: Vector3,
    clampToLine: boolean = true,
  ): number {
    const startPoint = point.clone().sub(this.#start);
    const dir = this.delta;
    const dirLengthSq = dir.lengthSq;
    if (dirLengthSq === 0) return 0;
    const t = startPoint.dot(dir) / dirLengthSq;
    return clampToLine ? clamp(t, 0, 1) : t;
  }

  /** Copies component values from the supplied instance into this one. */
  copy(line: Line3): Line3 {
    this.#start.copy(line.start);
    this.#end.copy(line.end);
    return this;
  }

  /** Returns true when every stored component exactly matches the argument. */
  equals(line: Line3): boolean {
    return this.#start.equals(line.start) && this.#end.equals(line.end);
  }

  /** Writes the segment midpoint into `target`. */
  getCenter(target: Vector3 = new Vector3()): Vector3 {
    return target.copy(this.#start).add(this.#end).multiplyScalar(0.5);
  }

  /** Copies `start` and `end` into this segment. */
  set(start: Vector3, end: Vector3): Line3 {
    this.#start.copy(start);
    this.#end.copy(end);
    return this;
  }
}
