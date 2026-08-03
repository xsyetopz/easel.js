import { Vector2 } from "../../math/Vector2.ts";
import { Curve } from "../Curve.ts";

/** Catmull-Rom basis for one scalar component. */
function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
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

/** 2D Catmull-Rom spline through a set of points. */
export class SplineCurve extends Curve {
  override type = "SplineCurve";
  #points: Vector2[];

  constructor(points: Vector2[] = []) {
    super();
    this.#points = points;
  }

  get points(): Vector2[] {
    return this.#points;
  }

  /** Returns the point on the spline at parameter t. */
  override getPoint(t: number, target: Vector2 = new Vector2()): Vector2 {
    const points = this.#points;
    const l = points.length;
    const p = (l - 1) * t;
    const intPoint = Math.floor(p);
    const weight = p - intPoint;

    const p0 = points[Math.max(0, intPoint - 1)];
    const p1 = points[intPoint];
    const p2 = points[Math.min(intPoint + 1, l - 1)];
    const p3 = points[Math.min(intPoint + 2, l - 1)];

    const x = catmullRom(p0.x, p1.x, p2.x, p3.x, weight);
    const y = catmullRom(p0.y, p1.y, p2.y, p3.y, weight);
    return target.set(x, y);
  }

  override clone(): SplineCurve {
    return new SplineCurve(this.#points.map((p) => p.clone()));
  }

  override copy(source: SplineCurve): this {
    super.copy(source);
    this.#points = source.points.map((p) => p.clone());
    return this;
  }
}
