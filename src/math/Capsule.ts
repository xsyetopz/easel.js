import type { Box3 } from "./Box3.ts";
import { Vector3 } from "./Vector3.ts";

/** A sphere swept along a finite line segment. */
export class Capsule {
  readonly #start: Vector3;
  readonly #end: Vector3;
  #radius: number;

  /** Constructs a capsule from two endpoints and a non-negative radius. */
  constructor(
    start: Vector3 = new Vector3(),
    end: Vector3 = new Vector3(0, 1, 0),
    radius: number = 1,
  ) {
    validateRadius(radius);
    this.#start = start.clone();
    this.#end = end.clone();
    this.#radius = radius;
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

  /** Capsule radius in world units. */
  get radius(): number {
    return this.#radius;
  }

  /** Replaces the capsule radius in world units. */
  set radius(value: number) {
    validateRadius(value);
    this.#radius = value;
  }

  /** Returns a new instance with the same component values. */
  clone(): Capsule {
    return new Capsule(this.#start, this.#end, this.#radius);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(capsule: Capsule): this {
    this.#start.copy(capsule.start);
    this.#end.copy(capsule.end);
    this.#radius = capsule.radius;
    return this;
  }

  /** Writes the midpoint between the endpoints into `target`. */
  getCenter(target: Vector3): Vector3 {
    return target.copy(this.#start).add(this.#end).multiplyScalar(0.5);
  }

  /** Returns true when this capsule overlaps `box`. */
  intersectsBox(box: Box3): boolean {
    return (
      segmentBoxDistanceSq(this.#start, this.#end, box) <= this.#radius ** 2
    );
  }

  /** Replaces both endpoints and the radius in place. */
  set(start: Vector3, end: Vector3, radius: number): this {
    validateRadius(radius);
    this.#start.copy(start);
    this.#end.copy(end);
    this.#radius = radius;
    return this;
  }

  /** Translates both endpoints by `offset` in place. */
  translate(offset: Vector3): this {
    this.#start.add(offset);
    this.#end.add(offset);
    return this;
  }
}

function segmentBoxDistanceSq(start: Vector3, end: Vector3, box: Box3): number {
  const delta = {
    x: end.x - start.x,
    y: end.y - start.y,
    z: end.z - start.z,
  };
  const breakpoints = [0, 1];
  addAxisBreakpoints(breakpoints, start.x, delta.x, [box.min.x, box.max.x]);
  addAxisBreakpoints(breakpoints, start.y, delta.y, [box.min.y, box.max.y]);
  addAxisBreakpoints(breakpoints, start.z, delta.z, [box.min.z, box.max.z]);
  breakpoints.sort((left, right) => left - right);

  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 0; index < breakpoints.length - 1; index++) {
    const lower = breakpoints[index];
    const upper = breakpoints[index + 1];
    const middle = (lower + upper) * 0.5;
    let coefficientA = 0;
    let coefficientB = 0;
    for (const [origin, axisDelta, min, max] of [
      [start.x, delta.x, box.min.x, box.max.x],
      [start.y, delta.y, box.min.y, box.max.y],
      [start.z, delta.z, box.min.z, box.max.z],
    ] as const) {
      const value = origin + axisDelta * middle;
      if (value < min) {
        coefficientA += axisDelta * axisDelta;
        coefficientB += axisDelta * (origin - min);
      } else if (value > max) {
        coefficientA += axisDelta * axisDelta;
        coefficientB += axisDelta * (origin - max);
      }
    }
    minimum = Math.min(
      minimum,
      pointBoxDistanceSq(start, delta, lower, box),
      pointBoxDistanceSq(start, delta, upper, box),
    );
    if (coefficientA > 0) {
      const stationary = Math.max(
        lower,
        Math.min(upper, -coefficientB / coefficientA),
      );
      minimum = Math.min(
        minimum,
        pointBoxDistanceSq(start, delta, stationary, box),
      );
    }
  }
  return minimum;
}

function addAxisBreakpoints(
  breakpoints: number[],
  origin: number,
  delta: number,
  bounds: readonly [min: number, max: number],
): void {
  if (delta === 0) return;
  for (const value of bounds) {
    const parameter = (value - origin) / delta;
    if (parameter > 0 && parameter < 1) breakpoints.push(parameter);
  }
}

function pointBoxDistanceSq(
  start: Vector3,
  delta: Readonly<{ x: number; y: number; z: number }>,
  parameter: number,
  box: Box3,
): number {
  return (
    axisDistanceSq(start.x + delta.x * parameter, box.min.x, box.max.x) +
    axisDistanceSq(start.y + delta.y * parameter, box.min.y, box.max.y) +
    axisDistanceSq(start.z + delta.z * parameter, box.min.z, box.max.z)
  );
}

function axisDistanceSq(value: number, min: number, max: number): number {
  let distance = 0;
  if (value < min) distance = min - value;
  else if (value > max) distance = value - max;
  return distance * distance;
}

function validateRadius(radius: number): void {
  if (!Number.isFinite(radius) || radius < 0) {
    throw new RangeError(
      "Capsule radius must be a finite non-negative number.",
    );
  }
}
