import { Vector2 } from "../math/Vector2.ts";
import { CurvePath } from "./CurvePath.ts";
import { CubicBezierCurve } from "./curves/CubicBezierCurve.ts";
import { EllipseCurve } from "./curves/EllipseCurve.ts";
import { LineCurve } from "./curves/LineCurve.ts";
import { QuadraticBezierCurve } from "./curves/QuadraticBezierCurve.ts";

/** 2D path built from lines, arcs, and bezier segments. */
export class Path extends CurvePath {
  override type = "Path";
  #currentPoint = new Vector2();

  constructor(points?: Vector2[]) {
    super();
    if (points) this.setFromPoints(points);
  }

  get currentPoint(): Vector2 {
    return this.#currentPoint;
  }

  /** Creates LineCurves connecting the given points and sets currentPoint to the last. */
  setFromPoints(points: Vector2[]): this {
    this.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.lineTo(points[i].x, points[i].y);
    }
    return this;
  }

  /** Moves currentPoint without adding a curve. */
  moveTo(x: number, y: number): this {
    this.#currentPoint.set(x, y);
    return this;
  }

  /** Adds a LineCurve from currentPoint to (x, y). */
  lineTo(x: number, y: number): this {
    this.add(new LineCurve(this.#currentPoint.clone(), new Vector2(x, y)));
    this.#currentPoint.set(x, y);
    return this;
  }

  /** Adds a QuadraticBezierCurve from currentPoint through (cpX, cpY) to (x, y). */
  quadraticCurveTo(cpX: number, cpY: number, x: number, y: number): this {
    this.add(
      new QuadraticBezierCurve(
        this.#currentPoint.clone(),
        new Vector2(cpX, cpY),
        new Vector2(x, y),
      ),
    );
    this.#currentPoint.set(x, y);
    return this;
  }

  /** Adds a CubicBezierCurve from currentPoint through two control points to (x, y). */
  bezierCurveTo(
    cp1X: number,
    cp1Y: number,
    cp2X: number,
    cp2Y: number,
    x: number,
    y: number,
  ): this {
    this.add(
      new CubicBezierCurve(
        this.#currentPoint.clone(),
        new Vector2(cp1X, cp1Y),
        new Vector2(cp2X, cp2Y),
        new Vector2(x, y),
      ),
    );
    this.#currentPoint.set(x, y);
    return this;
  }

  /** Adds an EllipseCurve at currentPoint + (x, y) offset. */
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean,
  ): this {
    const cx = this.#currentPoint.x + x;
    const cy = this.#currentPoint.y + y;
    return this.absarc(cx, cy, radius, startAngle, endAngle, clockwise);
  }

  /** Adds an EllipseCurve at absolute center (x, y). */
  absarc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean,
  ): this {
    return this.absellipse(
      x,
      y,
      radius,
      radius,
      startAngle,
      endAngle,
      clockwise,
      0,
    );
  }

  /** Adds an EllipseCurve at currentPoint + (x, y) offset. */
  ellipse(
    x: number,
    y: number,
    xR: number,
    yR: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean,
    rotation: number,
  ): this {
    const cx = this.#currentPoint.x + x;
    const cy = this.#currentPoint.y + y;
    return this.absellipse(
      cx,
      cy,
      xR,
      yR,
      startAngle,
      endAngle,
      clockwise,
      rotation,
    );
  }

  /** Adds an EllipseCurve at absolute center (x, y). */
  absellipse(
    x: number,
    y: number,
    xR: number,
    yR: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean,
    rotation: number,
  ): this {
    const curve = new EllipseCurve(
      x,
      y,
      xR,
      yR,
      startAngle,
      endAngle,
      clockwise,
      rotation,
    );
    if (this.curves.length > 0) {
      const firstPoint = curve.getPoint(0, undefined);
      if (!firstPoint.equals(this.#currentPoint)) {
        this.lineTo(firstPoint.x, firstPoint.y);
      }
    }
    this.add(curve);
    const lastPoint = curve.getPoint(1, undefined);
    this.#currentPoint.copy(lastPoint);
    return this;
  }

  override clone(): Path {
    const Ctor = this.constructor as new () => Path;
    return new Ctor().copy(this);
  }

  override copy(source: Path): this {
    super.copy(source);
    this.#currentPoint.copy(source.currentPoint);
    return this;
  }
}
