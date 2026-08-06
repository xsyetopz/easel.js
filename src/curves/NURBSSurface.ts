import { Vector3 } from "../math/Vector3.ts";
import { Vector4 } from "../math/Vector4.ts";
import type { NURBSControlPoint } from "./NURBSCurve.ts";
import { calcSurfacePoint } from "./NURBSUtils.ts";

/** CPU NURBS surface matching the three.js NURBSSurface addon. */
export class NURBSSurface {
  /** Three.js-compatible type guard. */
  readonly isNURBSSurface = true;
  /** First parametric polynomial degree. */
  degree1: number;
  /** Second parametric polynomial degree. */
  degree2: number;
  /** Knot vector for the first parameter. */
  knots1: number[];
  /** Knot vector for the second parameter. */
  knots2: number[];
  /** Homogeneous control-point grid. */
  controlPoints: Vector4[][];

  /** Constructs a rational B-spline surface from two knot vectors and a control grid. */
  constructor(
    degree1: number,
    degree2: number,
    knots1: number[],
    knots2: number[],
    controlPoints: NURBSControlPoint[][],
  ) {
    this.degree1 = Math.max(0, Math.floor(degree1));
    this.degree2 = Math.max(0, Math.floor(degree2));
    this.knots1 = [...knots1];
    this.knots2 = [...knots2];
    const length1 = Math.max(0, knots1.length - this.degree1 - 1);
    const length2 = Math.max(0, knots2.length - this.degree2 - 1);
    this.controlPoints = [];
    for (let i = 0; i < length1; i++) {
      this.controlPoints[i] = [];
      for (let j = 0; j < length2; j++) {
        const point = controlPoints[i]?.[j] ?? { x: 0, y: 0, z: 0, w: 1 };
        this.controlPoints[i][j] = new Vector4(
          point.x,
          point.y,
          point.z ?? 0,
          point.w ?? 1,
        );
      }
    }
  }

  /** Evaluates the surface at normalized parameters `u` and `v`. */
  getPoint(u: number, v: number, target: Vector3 = new Vector3()): Vector3 {
    const startU = this.knots1[0] ?? 0;
    const endU = this.knots1.at(-1) ?? startU;
    const startV = this.knots2[0] ?? 0;
    const endV = this.knots2.at(-1) ?? startV;
    return calcSurfacePoint(
      this.degree1,
      this.degree2,
      this.knots1,
      this.knots2,
      this.controlPoints,
      startU + (Number.isFinite(u) ? u : 0) * (endU - startU),
      startV + (Number.isFinite(v) ? v : 0) * (endV - startV),
      target,
    );
  }

  /** Returns an independent copy of this surface and its control grid. */
  clone(): NURBSSurface {
    return new NURBSSurface(
      this.degree1,
      this.degree2,
      this.knots1,
      this.knots2,
      this.controlPoints,
    );
  }
}
