import { Vector3 } from "../math/Vector3.ts";
import { Vector4 } from "../math/Vector4.ts";
import { Curve } from "./Curve.ts";
import { calcBSplinePoint, calcNURBSDerivatives } from "./NURBSUtils.ts";

/** Control-point shape accepted by NURBS curves and surfaces. */
export interface NURBSControlPoint {
  /** Cartesian x coordinate. */
  x: number;
  /** Cartesian y coordinate. */
  y: number;
  /** Optional Cartesian z coordinate. */
  z?: number;
  /** Optional homogeneous weight. */
  w?: number;
}

/** CPU NURBS curve matching the three.js NURBSCurve addon. */
export class NURBSCurve extends Curve {
  /** Serialization discriminator for this curve type. */
  override type = "NURBSCurve";
  /** Three.js-compatible type guard. */
  readonly isNURBSCurve = true;
  /** NURBS polynomial degree. */
  degree: number;
  /** Flat nondecreasing knot vector. */
  knots: number[];
  /** Homogeneous control points with weights in `w`. */
  controlPoints: Vector4[];
  /** Start knot index used to map normalized curve parameters. */
  startKnot: number;
  /** End knot index used to map normalized curve parameters. */
  endKnot: number;

  /** Constructs a rational B-spline curve from degree, knots, and control points. */
  constructor(
    degree: number,
    knots: number[],
    controlPoints: NURBSControlPoint[],
    startKnot: number = 0,
    endKnot: number = knots.length - 1,
  ) {
    super();
    this.degree = Math.max(0, Math.floor(degree));
    this.knots = [...knots];
    this.controlPoints = controlPoints.map(
      (point) => new Vector4(point.x, point.y, point.z ?? 0, point.w ?? 1),
    );
    this.startKnot = Math.max(0, Math.floor(startKnot));
    this.endKnot = Math.max(this.startKnot, Math.floor(endKnot));
  }

  /** Evaluates the rational curve at normalized parameter `t`. */
  override getPoint(t: number, target: Vector3 = new Vector3()): Vector3 {
    const start = this.knots[this.startKnot] ?? 0;
    const end = this.knots[this.endKnot] ?? start;
    const u = start + (Number.isFinite(t) ? t : 0) * (end - start);
    const point = calcBSplinePoint(
      this.degree,
      this.knots,
      this.controlPoints,
      u,
    );
    if (point.w !== 0 && point.w !== 1) point.divideScalar(point.w);
    return target.set(point.x, point.y, point.z);
  }

  /** Evaluates the unit tangent at normalized parameter `t`. */
  override getTangent(t: number, target: Vector3 = new Vector3()): Vector3 {
    const start = this.knots[0] ?? 0;
    const end = this.knots.at(-1) ?? start;
    const u = start + (Number.isFinite(t) ? t : 0) * (end - start);
    const derivatives = calcNURBSDerivatives(
      this.degree,
      this.knots,
      this.controlPoints,
      u,
      1,
    );
    return target.copy(derivatives[1] ?? new Vector3()).normalize();
  }

  /** Returns an independent copy with cloned knots and control points. */
  override clone(): NURBSCurve {
    return new NURBSCurve(
      this.degree,
      this.knots,
      this.controlPoints,
      this.startKnot,
      this.endKnot,
    ).copy(this);
  }

  /** Copies NURBS parameters and control points from another curve. */
  override copy(source: NURBSCurve): this {
    super.copy(source);
    this.degree = source.degree;
    this.knots = [...source.knots];
    this.controlPoints = source.controlPoints.map((point) => point.clone());
    this.startKnot = source.startKnot;
    this.endKnot = source.endKnot;
    return this;
  }

  /** Serializes NURBS parameters and control points. */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      degree: this.degree,
      knots: [...this.knots],
      controlPoints: this.controlPoints.map((point) => [
        point.x,
        point.y,
        point.z,
        point.w,
      ]),
      startKnot: this.startKnot,
      endKnot: this.endKnot,
    };
  }

  /** Restores NURBS parameters and control points from serialized data. */
  override fromJSON(json: Record<string, unknown>): this {
    super.fromJSON(json);
    if (typeof json["degree"] === "number") this.degree = json["degree"];
    if (Array.isArray(json["knots"])) {
      this.knots = json["knots"].filter(
        (value): value is number => typeof value === "number",
      );
    }
    if (Array.isArray(json["controlPoints"])) {
      this.controlPoints = json["controlPoints"]
        .filter(Array.isArray)
        .map(
          (point) =>
            new Vector4(
              point[0] ?? 0,
              point[1] ?? 0,
              point[2] ?? 0,
              point[3] ?? 1,
            ),
        );
    }
    if (typeof json["startKnot"] === "number")
      this.startKnot = json["startKnot"];
    if (typeof json["endKnot"] === "number") this.endKnot = json["endKnot"];
    return this;
  }
}
