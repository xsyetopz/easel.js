import { Vector3 } from "../../math/Vector3.ts";
import { Curve } from "../Curve.ts";

/** Catmull–Rom parameterization modes supported by `CatmullRomCurve3`. */
export type CurveType = "centripetal" | "chordal" | "catmullrom";

/** Three-dimensional Catmull–Rom spline through control points. */
export class CatmullRomCurve3 extends Curve {
  /** Serialization discriminator for this runtime type. */
  override type: string = "CatmullRomCurve3";
  /** Boolean type guard for this THREE.js-compatible curve type. */
  readonly isCatmullRomCurve3 = true;
  #points: Vector3[];
  #closed: boolean;
  #curveType: CurveType;
  #tension: number;

  /** Constructs a 3D Catmull–Rom spline from control points and interpolation settings. */
  constructor(
    points: Vector3[] = [],
    closed: boolean = false,
    curveType: CurveType = "centripetal",
    tension: number = 0.5,
  ) {
    super();
    this.#points = points.map((point) => point.clone());
    this.#closed = closed;
    this.#curveType = curveType;
    this.#tension = tension;
  }

  /** Mutable control-point list; direct edits require `updateArcLengths()`. */
  get points(): Vector3[] {
    return this.#points;
  }

  /** Replaces control points and invalidates cached lengths. */
  set points(value: Vector3[]) {
    this.#points = value.map((point) => point.clone());
    this.updateArcLengths();
  }

  /** Whether the spline joins its final control point back to its first. */
  get closed(): boolean {
    return this.#closed;
  }

  /** Controls closure and invalidates cached lengths. */
  set closed(value: boolean) {
    this.#closed = value;
    this.updateArcLengths();
  }

  /** Catmull–Rom parameterization used between control points. */
  get curveType(): CurveType {
    return this.#curveType;
  }

  /** Assigns the parameterization mode and invalidates cached lengths. */
  set curveType(value: CurveType) {
    this.#curveType = value;
    this.updateArcLengths();
  }

  /** Tension used by uniform Catmull–Rom interpolation. */
  get tension(): number {
    return this.#tension;
  }

  /** Assigns uniform interpolation tension and invalidates cached lengths. */
  set tension(value: number) {
    this.#tension = Number.isFinite(value) ? value : 0.5;
    this.updateArcLengths();
  }

  /** Evaluates the spline at normalized parameter `t` in `[0, 1]`. */
  override getPoint(t: number, target: Vector3 = new Vector3()): Vector3 {
    const points = this.#points;
    const length = points.length;
    if (length === 0) return target.set(0, 0, 0);
    if (length === 1) return target.copy(points[0]);

    const p = (length - (this.#closed ? 0 : 1)) * t;
    let intPoint = Math.floor(p);
    const weight = p - intPoint;
    let localWeight = weight;
    if (this.#closed) {
      intPoint +=
        intPoint > 0
          ? 0
          : (Math.floor(Math.abs(intPoint) / length) + 1) * length;
    }

    let p0: Vector3;
    let p3: Vector3;
    if (this.#closed || intPoint > 0) {
      p0 = points[(intPoint - 1 + length) % length];
    } else {
      p0 = new Vector3().subVectors(points[0], points[1]).add(points[0]);
    }

    const p1 = points[intPoint % length];
    const p2 = points[(intPoint + 1) % length];
    if (this.#closed || intPoint + 2 < length) {
      p3 = points[(intPoint + 2) % length];
    } else {
      p3 = new Vector3()
        .subVectors(points[length - 1], points[length - 2])
        .add(points[length - 1]);
    }

    if (this.#curveType === "centripetal" || this.#curveType === "chordal") {
      const power = this.#curveType === "chordal" ? 0.5 : 0.25;
      let dt0 = p0.distanceToSquared(p1) ** power;
      let dt1 = p1.distanceToSquared(p2) ** power;
      let dt2 = p2.distanceToSquared(p3) ** power;
      if (dt1 < 1e-4) dt1 = 1;
      if (dt0 < 1e-4) dt0 = dt1;
      if (dt2 < 1e-4) dt2 = dt1;
      return target.set(
        nonuniformCatmullRom(
          p0.x,
          p1.x,
          p2.x,
          p3.x,
          dt0,
          dt1,
          dt2,
          localWeight,
        ),
        nonuniformCatmullRom(
          p0.y,
          p1.y,
          p2.y,
          p3.y,
          dt0,
          dt1,
          dt2,
          localWeight,
        ),
        nonuniformCatmullRom(
          p0.z,
          p1.z,
          p2.z,
          p3.z,
          dt0,
          dt1,
          dt2,
          localWeight,
        ),
      );
    }

    if (this.#curveType === "catmullrom") {
      return target.set(
        uniformCatmullRom(p0.x, p1.x, p2.x, p3.x, localWeight, this.#tension),
        uniformCatmullRom(p0.y, p1.y, p2.y, p3.y, localWeight, this.#tension),
        uniformCatmullRom(p0.z, p1.z, p2.z, p3.z, localWeight, this.#tension),
      );
    }

    return target.copy(p1);
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): CatmullRomCurve3 {
    return new CatmullRomCurve3(
      this.#points,
      this.#closed,
      this.#curveType,
      this.#tension,
    ).copy(this);
  }

  /** Copies values from another Catmull-Rom curve. */
  override copy(source: CatmullRomCurve3): this {
    super.copy(source);
    this.#points = source.points.map((point) => point.clone());
    this.#closed = source.closed;
    this.#curveType = source.curveType;
    this.#tension = source.tension;
    return this;
  }

  /** Serializes Catmull–Rom control points and interpolation settings. */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      points: this.#points.map((point) => [point.x, point.y, point.z]),
      closed: this.#closed,
      curveType: this.#curveType,
      tension: this.#tension,
    };
  }

  /** Restores control points and interpolation settings from serialized data. */
  override fromJSON(json: Record<string, unknown>): this {
    super.fromJSON(json);
    const points = json["points"];
    if (Array.isArray(points)) {
      this.#points = points
        .filter((point): point is number[] => Array.isArray(point))
        .map(
          (point) => new Vector3(point[0] ?? 0, point[1] ?? 0, point[2] ?? 0),
        );
    }
    if (typeof json["closed"] === "boolean") this.#closed = json["closed"];
    if (
      json["curveType"] === "centripetal" ||
      json["curveType"] === "chordal" ||
      json["curveType"] === "catmullrom"
    ) {
      this.#curveType = json["curveType"];
    }
    if (typeof json["tension"] === "number") this.#tension = json["tension"];
    this.updateArcLengths();
    return this;
  }
}

/** Evaluates uniform Catmull-Rom interpolation for one component. */
function uniformCatmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
  tension: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const tangent1 = tension * (p2 - p0);
  const tangent2 = tension * (p3 - p1);
  return (
    p1 +
    tangent1 * t +
    (-3 * p1 + 3 * p2 - 2 * tangent1 - tangent2) * t2 +
    (2 * p1 - 2 * p2 + tangent1 + tangent2) * t3
  );
}

/** Evaluates non-uniform Catmull-Rom interpolation for one component. */
function nonuniformCatmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  dt0: number,
  dt1: number,
  dt2: number,
  t: number,
): number {
  let tangent1 = (p1 - p0) / dt0 - (p2 - p0) / (dt0 + dt1) + (p2 - p1) / dt1;
  let tangent2 = (p2 - p1) / dt1 - (p3 - p1) / (dt1 + dt2) + (p3 - p2) / dt2;
  tangent1 *= dt1;
  tangent2 *= dt1;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    p1 +
    tangent1 * t +
    (-3 * p1 + 3 * p2 - 2 * tangent1 - tangent2) * t2 +
    (2 * p1 - 2 * p2 + tangent1 + tangent2) * t3
  );
}
