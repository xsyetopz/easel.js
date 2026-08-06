import { Vector3 } from "../math/Vector3.ts";
import { Vector4 } from "../math/Vector4.ts";
import type { NURBSControlPoint } from "./NURBSCurve.ts";
import { calcVolumePoint } from "./NURBSUtils.ts";

/** CPU NURBS volume matching the three.js NURBSVolume addon. */
export class NURBSVolume {
  /** Three.js-compatible type guard. */
  readonly isNURBSVolume = true;
  /** First parametric polynomial degree. */
  degree1: number;
  /** Second parametric polynomial degree. */
  degree2: number;
  /** Third parametric polynomial degree. */
  degree3: number;
  /** Knot vector for the first parameter. */
  knots1: number[];
  /** Knot vector for the second parameter. */
  knots2: number[];
  /** Knot vector for the third parameter. */
  knots3: number[];
  /** Homogeneous control-point volume. */
  controlPoints: Vector4[][][];

  /** Constructs a rational B-spline volume from three knot vectors and a control grid. */
  constructor(
    degree1: number,
    degree2: number,
    degree3: number,
    knots1: number[],
    knots2: number[],
    knots3: number[],
    controlPoints: NURBSControlPoint[][][],
  ) {
    this.degree1 = Math.max(0, Math.floor(degree1));
    this.degree2 = Math.max(0, Math.floor(degree2));
    this.degree3 = Math.max(0, Math.floor(degree3));
    this.knots1 = [...knots1];
    this.knots2 = [...knots2];
    this.knots3 = [...knots3];
    const len1 = Math.max(0, knots1.length - this.degree1 - 1);
    const len2 = Math.max(0, knots2.length - this.degree2 - 1);
    const len3 = Math.max(0, knots3.length - this.degree3 - 1);
    this.controlPoints = [];
    for (let i = 0; i < len1; i++) {
      this.controlPoints[i] = [];
      for (let j = 0; j < len2; j++) {
        this.controlPoints[i][j] = [];
        for (let k = 0; k < len3; k++) {
          const point = controlPoints[i]?.[j]?.[k] ?? {
            x: 0,
            y: 0,
            z: 0,
            w: 1,
          };
          this.controlPoints[i][j][k] = new Vector4(
            point.x,
            point.y,
            point.z ?? 0,
            point.w ?? 1,
          );
        }
      }
    }
  }

  /** Evaluates the volume at normalized parameters `u`, `v`, and `w`. */
  getPoint(
    u: number,
    v: number,
    w: number,
    target: Vector3 = new Vector3(),
  ): Vector3 {
    const startU = this.knots1[0] ?? 0;
    const startV = this.knots2[0] ?? 0;
    const startW = this.knots3[0] ?? 0;
    return calcVolumePoint(
      this.degree1,
      this.degree2,
      this.degree3,
      this.knots1,
      this.knots2,
      this.knots3,
      this.controlPoints,
      startU +
        (Number.isFinite(u) ? u : 0) *
          ((this.knots1.at(-1) ?? startU) - startU),
      startV +
        (Number.isFinite(v) ? v : 0) *
          ((this.knots2.at(-1) ?? startV) - startV),
      startW +
        (Number.isFinite(w) ? w : 0) *
          ((this.knots3.at(-1) ?? startW) - startW),
      target,
    );
  }

  /** Returns an independent copy of this volume and its control grid. */
  clone(): NURBSVolume {
    return new NURBSVolume(
      this.degree1,
      this.degree2,
      this.degree3,
      this.knots1,
      this.knots2,
      this.knots3,
      this.controlPoints,
    );
  }
}
