import { Vector2 } from "../../math/Vector2.ts";
import { Curve } from "../Curve.ts";

/** Catmull–Rom basis evaluation options for one scalar component. */
interface CatmullRomOptions {
  t: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

/** Catmull–Rom basis evaluation for one scalar component. */
function catmullRom({ t, p0, p1, p2, p3 }: CatmullRomOptions): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/** Two-dimensional Catmull–Rom spline through control points. */
export class SplineCurve extends Curve {
  /** Serialization discriminator for this runtime type. */
  override type: string = "SplineCurve";
  /** Boolean type guard for this THREE.js-compatible curve type. */
  readonly isSplineCurve = true;
  #points: Vector2[];

  /** Constructs a 2D Catmull–Rom spline from control points. */
  constructor(points: Vector2[] = []) {
    super();
    this.#points = points.map((point) => point.clone());
  }

  /** Mutable control-point list; direct edits require `updateArcLengths()`. */
  get points(): Vector2[] {
    return this.#points;
  }

  /** Replaces control points and invalidates cached lengths. */
  set points(value: Vector2[]) {
    this.#points = value.map((point) => point.clone());
    this.updateArcLengths();
  }

  /** Evaluates the spline at normalized parameter `t` in `[0, 1]`. */
  override getPoint(t: number, target: Vector2 = new Vector2()): Vector2 {
    const points = this.#points;
    if (points.length === 0) return target.set(0, 0);
    if (points.length === 1) return target.copy(points[0]);

    const p = (points.length - 1) * t;
    const intPoint = Math.floor(p);
    const weight = p - intPoint;
    const p0 = points[intPoint === 0 ? intPoint : intPoint - 1];
    const p1 = points[intPoint];
    const p2 =
      points[intPoint > points.length - 2 ? points.length - 1 : intPoint + 1];
    const p3 =
      points[intPoint > points.length - 3 ? points.length - 1 : intPoint + 2];
    return target.set(
      catmullRom({ t: weight, p0: p0.x, p1: p1.x, p2: p2.x, p3: p3.x }),
      catmullRom({ t: weight, p0: p0.y, p1: p1.y, p2: p2.y, p3: p3.y }),
    );
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): SplineCurve {
    return new SplineCurve(this.#points).copy(this);
  }

  /** Copies values from another spline. */
  override copy(source: SplineCurve): this {
    super.copy(source);
    this.#points = source.points.map((point) => point.clone());
    return this;
  }

  /** Serializes spline control points and base curve settings. */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      points: this.#points.map((point) => [point.x, point.y]),
    };
  }

  /** Restores spline control points from serialized data. */
  override fromJSON(json: Record<string, unknown>): this {
    super.fromJSON(json);
    const points = (json as { points?: unknown }).points;
    if (Array.isArray(points)) {
      this.#points = points
        .filter((point): point is number[] => Array.isArray(point))
        .map((point) => new Vector2(point[0] ?? 0, point[1] ?? 0));
    }
    this.updateArcLengths();
    return this;
  }
}
