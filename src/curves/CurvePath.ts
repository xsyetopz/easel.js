import { Vector2 } from "../math/Vector2.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Curve } from "./Curve.ts";
import { ArcCurve } from "./curves/ArcCurve.ts";
import { CatmullRomCurve3 } from "./curves/CatmullRomCurve3.ts";
import { CubicBezierCurve } from "./curves/CubicBezierCurve.ts";
import { CubicBezierCurve3 } from "./curves/CubicBezierCurve3.ts";
import { EllipseCurve } from "./curves/EllipseCurve.ts";
import { LineCurve } from "./curves/LineCurve.ts";
import { LineCurve3 } from "./curves/LineCurve3.ts";
import { QuadraticBezierCurve } from "./curves/QuadraticBezierCurve.ts";
import { QuadraticBezierCurve3 } from "./curves/QuadraticBezierCurve3.ts";
import { SplineCurve } from "./curves/SplineCurve.ts";

type CurvePathJSON = Record<string, unknown> & {
  autoClose?: unknown;
  curves?: unknown;
  type?: unknown;
};

/** Ordered sequence of connected curves forming a path. */
export class CurvePath extends Curve {
  /** Serialization discriminator for this runtime type. */
  override type: string = "CurvePath";
  #curves: Curve[] = [];
  #autoClose = false;
  #cacheCurveLengths: number[] | undefined;

  /** Child curves in traversal order; prefer `add` or assignment to preserve caches. */
  get curves(): Curve[] {
    return this.#curves;
  }

  /** Replaces child curves and invalidates cumulative path lengths. */
  set curves(value: Curve[]) {
    this.#curves = value.slice();
    this.#invalidateCurveLengths(false);
  }

  /** Whether sampling appends the first point to close the returned list. */
  get autoClose(): boolean {
    return this.#autoClose;
  }

  /** Controls whether sampling appends the first point to close the returned list. */
  set autoClose(value: boolean) {
    this.#autoClose = value;
    this.#invalidateCurveLengths(false);
  }

  /** Cached cumulative lengths exposed for THREE.js-compatible inspection. */
  get cacheLengths(): number[] | undefined {
    return this.#cacheCurveLengths;
  }

  /** Replaces the cached cumulative child-curve lengths. */
  set cacheLengths(value: number[] | undefined) {
    this.#cacheCurveLengths = value;
  }

  /** Appends a child curve and invalidates cumulative path lengths. */
  add(curve: Curve): void {
    this.#curves.push(curve);
    this.#invalidateCurveLengths(false);
  }

  /** Closes the path by appending a segment from its end to its start. */
  closePath(): this {
    if (this.#curves.length === 0) return this;
    const startCurve = this.#curves[0];
    const endCurve = this.#curves.at(-1);
    if (!(startCurve && endCurve)) return this;
    const startPoint = startCurve.getPoint(0);
    const endPoint = endCurve.getPoint(1);
    if (!(startPoint && endPoint) || pointsEqual(startPoint, endPoint))
      return this;
    if (startPoint.z !== undefined || endPoint.z !== undefined) {
      this.#curves.push(
        new LineCurve3(toVector3(endPoint), toVector3(startPoint)),
      );
    } else {
      this.#curves.push(
        new LineCurve(toVector2(endPoint), toVector2(startPoint)),
      );
    }
    this.#invalidateCurveLengths(false);
    return this;
  }

  /** Evaluates a point at normalized global path parameter `t`. */
  override getPoint(
    t: number,
    target?: { x: number; y: number; z?: number },
  ): { x: number; y: number; z?: number } | undefined {
    if (this.#curves.length === 0) return void 0;
    const totalLength = this.length;
    const d = clampUnit(t) * totalLength;
    const curveLengths = this.curveLengths;
    for (let i = 0; i < this.#curves.length; i++) {
      const cumulative = curveLengths[i] ?? 0;
      if (cumulative >= d || i === this.#curves.length - 1) {
        const curve = this.#curves[i];
        const previous = i === 0 ? 0 : (curveLengths[i - 1] ?? 0);
        const segmentLength = cumulative - previous;
        const u = segmentLength === 0 ? 0 : (d - previous) / segmentLength;
        const vectorTarget = hasVectorWriters(target) ? target : undefined;
        const point = curve.getPointAt(u, vectorTarget);
        if (target && point && point !== target) {
          target.x = point.x;
          target.y = point.y;
          if (point.z !== undefined) target.z = point.z;
          return target;
        }
        return point;
      }
    }
    return void 0;
  }

  /** Approximate total arc length across all child curves. */
  override get length(): number {
    const lengths = this.curveLengths;
    return lengths.at(-1) ?? 0;
  }

  /** Cumulative child-curve lengths used to map global path parameters. */
  get curveLengths(): number[] {
    if (
      this.#cacheCurveLengths !== undefined &&
      this.#cacheCurveLengths.length === Math.max(1, this.#curves.length)
    ) {
      return this.#cacheCurveLengths;
    }

    if (this.#curves.length === 0) {
      this.#cacheCurveLengths = [0];
      return this.#cacheCurveLengths;
    }

    const lengths: number[] = [];
    let sum = 0;
    for (const curve of this.#curves) {
      sum += curve.length;
      lengths.push(sum);
    }
    this.#cacheCurveLengths = lengths;
    return lengths;
  }

  /** Drops path lengths and optionally invalidates every child curve cache. */
  override updateArcLengths(): void {
    this.#invalidateCurveLengths(true);
  }

  /** Samples `divisions + 1` parameter-spaced points across the path. */
  override getPoints(
    divisions: number = 12,
  ): Array<{ x: number; y: number; z?: number } | undefined> {
    const count = normalizePathDivisions(divisions);
    const points: Array<{ x: number; y: number; z?: number } | undefined> = [];
    for (let i = 0; i <= count; i++) {
      points.push(this.getPoint(count === 0 ? 0 : i / count));
    }
    if (
      this.#autoClose &&
      points.length > 1 &&
      !pointsEqual(points[0], points.at(-1))
    ) {
      points.push(points[0]);
    }
    return points;
  }

  /** Samples `divisions + 1` approximately arc-length-spaced points across the path. */
  override getSpacedPoints(
    divisions: number = 40,
  ): Array<{ x: number; y: number; z?: number } | undefined> {
    const count = normalizePathDivisions(divisions);
    const points: Array<{ x: number; y: number; z?: number } | undefined> = [];
    for (let i = 0; i <= count; i++) {
      points.push(this.getPointAt(count === 0 ? 0 : i / count));
    }
    if (
      this.#autoClose &&
      points.length > 1 &&
      !pointsEqual(points[0], points.at(-1))
    ) {
      points.push(points[0]);
    }
    return points;
  }

  /** Returns an independent copy with cloned child curves. */
  override clone(): CurvePath {
    const Ctor = this.constructor as new () => CurvePath;
    return new Ctor().copy(this);
  }

  /** Copies child curves and path sampling settings. */
  override copy(source: CurvePath): this {
    super.copy(source);
    this.#curves = source.curves.map((curve) => curve.clone());
    this.#autoClose = source.autoClose;
    this.#invalidateCurveLengths(false);
    return this;
  }

  /** Serializes this path and all child curves. */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      autoClose: this.#autoClose,
      curves: this.#curves.map((curve) => curve.toJSON()),
    };
  }

  /** Restores path settings and child curves from serialized data. */
  override fromJSON(json: CurvePathJSON): this {
    super.fromJSON(json);
    if (typeof json.autoClose === "boolean") this.#autoClose = json.autoClose;
    const curves = json.curves;
    this.#curves = Array.isArray(curves)
      ? curves
          .filter((curve): curve is Record<string, unknown> => isRecord(curve))
          .map((curve) => curveFromJSON(curve))
      : [];
    this.#invalidateCurveLengths(false);
    return this;
  }

  /** Invalidates cached cumulative lengths and optionally child curves. */
  #invalidateCurveLengths(invalidateChildren: boolean): void {
    this.#cacheCurveLengths = undefined;
    super.updateArcLengths();
    if (invalidateChildren) {
      for (const curve of this.#curves) curve.updateArcLengths();
    }
  }
}

/** Clamps a path parameter to its valid range. */
function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/** Returns a finite, non-negative integer path subdivision count. */
function normalizePathDivisions(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

/** Compares 2D or 3D point-like objects. */
function pointsEqual(
  a: { x: number; y: number; z?: number } | undefined,
  b: { x: number; y: number; z?: number } | undefined,
): boolean {
  return Boolean(
    a && b && a.x === b.x && a.y === b.y && (a.z ?? 0) === (b.z ?? 0),
  );
}

/** Returns whether a target provides a vector-style set/copy writer. */
function hasVectorWriters(
  target: { x: number; y: number; z?: number } | undefined,
): target is {
  x: number;
  y: number;
  z?: number;
  copy: (value: never) => unknown;
} {
  return Boolean(
    target && typeof (target as { copy?: unknown }).copy === "function",
  );
}

/** Converts a point-like value to a Vector2. */
function toVector2(point: { x: number; y: number }): Vector2 {
  return new Vector2(point.x, point.y);
}

/** Converts a point-like value to a Vector3. */
function toVector3(point: { x: number; y: number; z?: number }): Vector3 {
  return new Vector3(point.x, point.y, point.z ?? 0);
}

/** Narrows unknown input to a JSON object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reconstructs one supported THREE.js-compatible curve from JSON. */
function curveFromJSON(json: CurvePathJSON): Curve {
  const type = json.type;
  let curve: Curve;
  switch (type) {
    case "ArcCurve":
      curve = new ArcCurve();
      break;
    case "CatmullRomCurve3":
      curve = new CatmullRomCurve3();
      break;
    case "CubicBezierCurve":
      curve = new CubicBezierCurve();
      break;
    case "CubicBezierCurve3":
      curve = new CubicBezierCurve3();
      break;
    case "EllipseCurve":
      curve = new EllipseCurve();
      break;
    case "LineCurve":
      curve = new LineCurve();
      break;
    case "LineCurve3":
      curve = new LineCurve3();
      break;
    case "QuadraticBezierCurve":
      curve = new QuadraticBezierCurve();
      break;
    case "QuadraticBezierCurve3":
      curve = new QuadraticBezierCurve3();
      break;
    case "SplineCurve":
      curve = new SplineCurve();
      break;
    default:
      throw new TypeError(
        `CurvePath.fromJSON: unsupported curve type ${String(type)}.`,
      );
  }
  return curve.fromJSON(json);
}
