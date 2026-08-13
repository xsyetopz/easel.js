import { Vector2 } from "../math/Vector2.ts";
import { CurvePath } from "./CurvePath.ts";
import { CubicBezierCurve } from "./curves/CubicBezierCurve.ts";
import { EllipseCurve } from "./curves/EllipseCurve.ts";
import { LineCurve } from "./curves/LineCurve.ts";
import { QuadraticBezierCurve } from "./curves/QuadraticBezierCurve.ts";
import { SplineCurve } from "./curves/SplineCurve.ts";

type PathJSON = Record<string, unknown> & {
  currentPoint?: unknown;
};

/** 2D path built from lines, arcs, splines, and Bezier segments. */
export class Path extends CurvePath {
  /** Serialization discriminator for this runtime type. */
  override type: string = "Path";
  readonly #currentPoint = new Vector2();

  /** Constructs a path and optionally connects the supplied points. */
  constructor(points?: Vector2[]) {
    super();
    if (points && points.length > 0) this.setFromPoints(points);
  }

  /** Mutable endpoint used as the origin for subsequent path commands. */
  get currentPoint(): Vector2 {
    return this.#currentPoint;
  }

  /** Replaces the endpoint used by subsequent path commands. */
  set currentPoint(value: Vector2) {
    this.#currentPoint.copy(value);
  }

  /** Adds line segments that connect the supplied points in order. */
  setFromPoints(points: Vector2[]): this {
    if (points.length === 0) return this;
    this.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++)
      this.lineTo(points[i].x, points[i].y);
    return this;
  }

  /** Moves the current point without adding a curve. */
  moveTo(x: number, y: number): this {
    this.#currentPoint.set(x, y);
    return this;
  }

  /** Appends a line from the current endpoint to `(x, y)`. */
  lineTo(x: number, y: number): this {
    this.add(new LineCurve(this.#currentPoint, new Vector2(x, y)));
    this.#currentPoint.set(x, y);
    return this;
  }

  /** Appends a quadratic Bezier from the current endpoint. */
  quadraticCurveTo(cpX: number, cpY: number, x: number, y: number): this {
    this.add(
      new QuadraticBezierCurve(
        this.#currentPoint,
        new Vector2(cpX, cpY),
        new Vector2(x, y),
      ),
    );
    this.#currentPoint.set(x, y);
    return this;
  }

  /** Appends a cubic Bezier from the current endpoint. */
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
        this.#currentPoint,
        new Vector2(cp1X, cp1Y),
        new Vector2(cp2X, cp2Y),
        new Vector2(x, y),
      ),
    );
    this.#currentPoint.set(x, y);
    return this;
  }

  /** Appends a Catmull–Rom spline beginning at the current endpoint. */
  splineThru(points: Vector2[]): this {
    if (points.length === 0) return this;
    this.add(new SplineCurve([this.#currentPoint, ...points]));
    const lastPoint = points.at(-1);
    if (!lastPoint) return this;
    this.#currentPoint.copy(lastPoint);
    return this;
  }

  /** Appends an arc whose center is offset from the current endpoint. */
  arc(
    x: number = 0,
    y: number = 0,
    radius: number = 1,
    startAngle: number = 0,
    endAngle: number = Math.PI * 2,
    clockwise: boolean = false,
  ): this {
    return this.absarc(
      this.#currentPoint.x + x,
      this.#currentPoint.y + y,
      radius,
      startAngle,
      endAngle,
      clockwise,
    );
  }

  /** Appends an arc centered at the supplied absolute coordinates. */
  absarc(
    x: number = 0,
    y: number = 0,
    radius: number = 1,
    startAngle: number = 0,
    endAngle: number = Math.PI * 2,
    clockwise: boolean = false,
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

  /** Appends an ellipse whose center is offset from the current endpoint. */
  ellipse(
    x: number = 0,
    y: number = 0,
    xRadius: number = 1,
    yRadius: number = 1,
    startAngle: number = 0,
    endAngle: number = Math.PI * 2,
    clockwise: boolean = false,
    rotation: number = 0,
  ): this {
    return this.absellipse(
      this.#currentPoint.x + x,
      this.#currentPoint.y + y,
      xRadius,
      yRadius,
      startAngle,
      endAngle,
      clockwise,
      rotation,
    );
  }

  /** Appends an ellipse centered at the supplied absolute coordinates. */
  absellipse(
    x: number = 0,
    y: number = 0,
    xRadius: number = 1,
    yRadius: number = 1,
    startAngle: number = 0,
    endAngle: number = Math.PI * 2,
    clockwise: boolean = false,
    rotation: number = 0,
  ): this {
    const curve = new EllipseCurve(
      x,
      y,
      xRadius,
      yRadius,
      startAngle,
      endAngle,
      clockwise,
      rotation,
    );
    if (this.curves.length > 0) {
      const firstPoint = curve.getPoint(0);
      if (!firstPoint) return this;
      if (!firstPoint.equals(this.#currentPoint))
        this.lineTo(firstPoint.x, firstPoint.y);
    }
    this.add(curve);
    const endPoint = curve.getPoint(1);
    if (endPoint) this.#currentPoint.copy(endPoint);
    return this;
  }

  /** Returns an independent copy with cloned child curves. */
  override clone(): Path {
    const Ctor = this.constructor as new () => Path;
    return new Ctor().copy(this);
  }

  /** Copies child curves, closure settings, and the current endpoint. */
  override copy(source: Path): this {
    super.copy(source);
    this.#currentPoint.copy(source.currentPoint);
    return this;
  }

  /** Serializes child curves, path settings, and the current endpoint. */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      currentPoint: [this.#currentPoint.x, this.#currentPoint.y],
    };
  }

  /** Restores path settings and endpoint from serialized data. */
  override fromJSON(json: Record<string, unknown>): this {
    super.fromJSON(json);
    const { currentPoint } = json as PathJSON;
    if (Array.isArray(currentPoint)) this.#currentPoint.fromArray(currentPoint);
    return this;
  }
}
