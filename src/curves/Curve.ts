import { clamp } from "../math/MathUtils.ts";
import { Vector3 } from "../math/Vector3.ts";

/** Point-like object returned by a curve evaluation. */
interface CurvePoint {
  x: number;
  y: number;
  z?: number;
}

/** Frenet frame vectors generated for a three-dimensional curve. */
export interface FrenetFrames {
  /** Unit tangent vectors at each requested subdivision. */
  tangents: Vector3[];
  /** Unit normal vectors at each requested subdivision. */
  normals: Vector3[];
  /** Unit binormal vectors at each requested subdivision. */
  binormals: Vector3[];
}

/**
 * Base class for deterministic parametric curves.
 *
 * Arc-length sampling is bounded by caller-selected subdivisions; no adaptive
 * work is performed behind the render loop.
 */
export class Curve {
  /** Serialization discriminator for this runtime type. */
  type: string = "Curve";
  #arcLengthDivisions = 200;
  #cacheArcLengths: number[] | undefined;
  #needsUpdate = false;

  /** Number of subdivisions used for bounded arc-length approximation. */
  get arcLengthDivisions(): number {
    return this.#arcLengthDivisions;
  }

  /** Sets bounded arc-length subdivisions and invalidates the cached lengths. */
  set arcLengthDivisions(value: number) {
    const divisions = normalizeDivisions(value);
    if (divisions === this.#arcLengthDivisions) return;
    this.#arcLengthDivisions = divisions;
    this.updateArcLengths();
  }

  /** Whether the cached arc lengths are invalid and must be recomputed. */
  get needsUpdate(): boolean {
    return this.#needsUpdate;
  }

  /** Marks or clears arc-length invalidation; setting `true` drops cached lengths. */
  set needsUpdate(value: boolean) {
    this.#needsUpdate = value;
    if (this.#needsUpdate) this.#cacheArcLengths = undefined;
  }

  /**
   * Returns a point on the curve at parameter `t`.
   * Subclasses must implement this method.
   */
  getPoint(_t: number, _target?: CurvePoint): CurvePoint | undefined {
    throw new Error("Curve.getPoint must be implemented by a concrete curve.");
  }

  /** Evaluates a point at normalized arc-length fraction `u`. */
  getPointAt(u: number, target?: CurvePoint): CurvePoint | undefined {
    return this.getPoint(this.getUtoTmapping(u), target);
  }

  /** Samples `divisions + 1` points at uniform parameter intervals. */
  getPoints(divisions: number = 5): Array<CurvePoint | undefined> {
    const count = normalizeDivisions(divisions);
    const points: Array<CurvePoint | undefined> = [];
    for (let d = 0; d <= count; d++) {
      points.push(this.getPoint(count === 0 ? 0 : d / count));
    }
    return points;
  }

  /** Samples `divisions + 1` points at approximately uniform arc-length intervals. */
  getSpacedPoints(divisions: number = 5): Array<CurvePoint | undefined> {
    const count = normalizeDivisions(divisions);
    const points: Array<CurvePoint | undefined> = [];
    for (let d = 0; d <= count; d++) {
      points.push(this.getPointAt(count === 0 ? 0 : d / count));
    }
    return points;
  }

  /** Approximate total arc length using the configured subdivision count. */
  get length(): number {
    const lengths = this.getLengths();
    return lengths[lengths.length - 1] ?? 0;
  }

  /**
   * Computes cumulative arc lengths using exactly the requested subdivisions.
   * Results are cached per subdivision count until the curve is invalidated.
   */
  getLengths(divisions: number = this.arcLengthDivisions): number[] {
    const count = normalizeDivisions(divisions);
    if (
      this.#cacheArcLengths !== undefined &&
      this.#cacheArcLengths.length === count + 1 &&
      !this.#needsUpdate
    ) {
      return this.#cacheArcLengths;
    }

    this.#needsUpdate = false;
    const cache = [0];
    const first = this.getPoint(0);
    if (!first) {
      while (cache.length <= count) cache.push(0);
      this.#cacheArcLengths = cache;
      return cache;
    }

    let last = first;
    let sum = 0;
    for (let p = 1; p <= count; p++) {
      const current = this.getPoint(count === 0 ? 0 : p / count);
      if (!current) {
        cache.push(sum);
        continue;
      }
      sum += distanceBetween(current, last);
      cache.push(sum);
      last = current;
    }

    this.#cacheArcLengths = cache;
    return cache;
  }

  /** Drops cached arc lengths after a caller mutates curve data directly. */
  updateArcLengths(): void {
    this.#needsUpdate = true;
    this.#cacheArcLengths = undefined;
  }

  /**
   * Maps an arc-length fraction or absolute distance to parameter `t`.
   * Inputs are clamped to the finite range represented by the curve.
   */
  getUtoTmapping(u: number, distance?: number): number {
    const arcLengths = this.getLengths();
    const lastIndex = arcLengths.length - 1;
    if (lastIndex <= 0) return 0;

    const totalLength = arcLengths[lastIndex] ?? 0;
    const requested = distance ?? u * totalLength;
    const targetArcLength = clamp(
      Number.isFinite(requested) ? requested : 0,
      0,
      totalLength,
    );

    let low = 0;
    let high = lastIndex;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const comparison = (arcLengths[mid] ?? 0) - targetArcLength;
      if (comparison < 0) low = mid + 1;
      else if (comparison > 0) high = mid - 1;
      else return mid / lastIndex;
    }

    const index = clamp(high, 0, lastIndex - 1);
    const lengthBefore = arcLengths[index] ?? 0;
    const lengthAfter = arcLengths[index + 1] ?? lengthBefore;
    const segmentLength = lengthAfter - lengthBefore;
    const segmentFraction =
      segmentLength > 0 ? (targetArcLength - lengthBefore) / segmentLength : 0;
    return (index + clamp(segmentFraction, 0, 1)) / lastIndex;
  }

  /** Approximates a unit tangent with a bounded numerical derivative. */
  getTangent(t: number, target?: CurvePoint): CurvePoint | undefined {
    const delta = 1e-4;
    const t1 = clamp(Number.isFinite(t) ? t - delta : 0, 0, 1);
    const t2 = clamp(Number.isFinite(t) ? t + delta : delta, 0, 1);
    const pt1 = this.getPoint(t1);
    const pt2 = this.getPoint(t2);
    if (!(pt1 && pt2)) return;
    return normalizeDifference(pt1, pt2, target);
  }

  /** Returns a unit tangent at an arc-length fraction. */
  getTangentAt(u: number, target?: CurvePoint): CurvePoint | undefined {
    return this.getTangent(this.getUtoTmapping(u), target);
  }

  /**
   * Generates deterministic Frenet frames for a three-dimensional curve.
   * The caller controls the number of subdivisions; no hidden adaptive work is
   * performed.
   */
  computeFrenetFrames(segments: number, closed: boolean = false): FrenetFrames {
    const count = normalizeSegments(segments);
    const tangents: Vector3[] = [];
    const normals: Vector3[] = [];
    const binormals: Vector3[] = [];
    for (let i = 0; i <= count; i++) {
      const tangent = this.getTangentAt(
        count === 0 ? 0 : i / count,
        new Vector3(),
      );
      if (!tangent || tangent.z === undefined) {
        throw new TypeError("Curve.computeFrenetFrames requires a 3D curve.");
      }
      tangents.push(new Vector3(tangent.x, tangent.y, tangent.z));
    }

    const normal = chooseInitialNormal(tangents[0] ?? new Vector3(0, 0, 1));
    const vec = new Vector3().crossVectors(
      tangents[0] ?? new Vector3(0, 0, 1),
      normal,
    );
    if (vec.length > 0) vec.normalize();
    const initialNormal = new Vector3().crossVectors(
      tangents[0] ?? new Vector3(0, 0, 1),
      vec,
    );
    if (initialNormal.length > 0) initialNormal.normalize();
    const initialBinormal = new Vector3().crossVectors(
      tangents[0] ?? new Vector3(0, 0, 1),
      initialNormal,
    );
    if (initialBinormal.length > 0) initialBinormal.normalize();
    normals.push(initialNormal);
    binormals.push(initialBinormal);

    for (let i = 1; i <= count; i++) {
      const previousTangent = tangents[i - 1];
      const tangent = tangents[i];
      const nextNormal = normals[i - 1].clone();
      const axis = new Vector3().crossVectors(previousTangent, tangent);
      if (axis.length > Number.EPSILON) {
        axis.normalize();
        const theta = Math.acos(clamp(previousTangent.dot(tangent), -1, 1));
        rotateAroundAxis(nextNormal, axis, theta);
      }
      normals.push(nextNormal);
      const binormal = new Vector3().crossVectors(tangent, nextNormal);
      if (binormal.length > 0) binormal.normalize();
      binormals.push(binormal);
    }

    if (closed && count > 0) {
      let theta = Math.acos(clamp(normals[0].dot(normals[count]), -1, 1));
      const cross = new Vector3().crossVectors(normals[0], normals[count]);
      if (tangents[0].dot(cross) > 0) theta = -theta;
      theta /= count;
      for (let i = 1; i <= count; i++) {
        rotateAroundAxis(normals[i], tangents[i], theta * i);
        binormals[i].crossVectors(tangents[i], normals[i]).normalize();
      }
    }

    return { tangents, normals, binormals };
  }

  /** Returns a concrete curve copy with base sampling settings preserved. */
  clone(): Curve {
    const Ctor = this.constructor as new () => Curve;
    return new Ctor().copy(this);
  }

  /** Copies base sampling settings from another curve. */
  copy(source: Curve): this {
    this.arcLengthDivisions = source.arcLengthDivisions;
    return this;
  }

  /** Serializes base curve settings used for bounded sampling. */
  toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      arcLengthDivisions: this.arcLengthDivisions,
    };
  }

  /** Restores base curve settings from serialized data. */
  fromJSON(json: Record<string, unknown>): this {
    const divisions = json["arcLengthDivisions"];
    if (typeof divisions === "number") this.arcLengthDivisions = divisions;
    return this;
  }
}

/** Returns a finite, non-negative integer subdivision count. */
function normalizeDivisions(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

/** Returns a finite, non-negative segment count, requiring one frame minimum. */
function normalizeSegments(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.floor(value));
}

/** Computes Euclidean distance between 2D or 3D points. */
function distanceBetween(a: CurvePoint, b: CurvePoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Normalizes a point difference, optionally writing into the supplied target. */
function normalizeDifference(
  a: CurvePoint,
  b: CurvePoint,
  target?: CurvePoint,
): CurvePoint {
  const out =
    target ?? (b.z === undefined ? { x: 0, y: 0 } : { x: 0, y: 0, z: 0 });
  out.x = b.x - a.x;
  out.y = b.y - a.y;
  const hasZ = b.z !== undefined || a.z !== undefined;
  if (hasZ) out.z = (b.z ?? 0) - (a.z ?? 0);
  const length = Math.sqrt(out.x * out.x + out.y * out.y + (out.z ?? 0) ** 2);
  if (length > 0) {
    out.x /= length;
    out.y /= length;
    if (hasZ) out.z = (out.z ?? 0) / length;
  } else {
    out.x = 0;
    out.y = 0;
    if (hasZ) out.z = 0;
  }
  return out;
}

/** Chooses a stable axis least aligned with a tangent. */
function chooseInitialNormal(tangent: Vector3): Vector3 {
  const tx = Math.abs(tangent.x);
  const ty = Math.abs(tangent.y);
  const tz = Math.abs(tangent.z);
  if (tx <= ty && tx <= tz) return new Vector3(1, 0, 0);
  if (ty <= tz) return new Vector3(0, 1, 0);
  return new Vector3(0, 0, 1);
}

/** Rotates a vector around a unit axis using Rodrigues' formula. */
function rotateAroundAxis(vector: Vector3, axis: Vector3, angle: number): void {
  const { x, y, z } = vector;
  const { x: ax, y: ay, z: az } = axis;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dot = ax * x + ay * y + az * z;
  vector.set(
    x * cos + (ay * z - az * y) * sin + ax * dot * (1 - cos),
    y * cos + (az * x - ax * z) * sin + ay * dot * (1 - cos),
    z * cos + (ax * y - ay * x) * sin + az * dot * (1 - cos),
  );
}
