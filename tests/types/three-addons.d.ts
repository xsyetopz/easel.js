declare module "three/addons/curves/NURBSCurve.js" {
  import type { Vector3, Vector4 } from "three";

  export class NURBSCurve {
    constructor(
      degree: number,
      knots: number[],
      controlPoints: Vector4[],
      startKnot?: number,
      endKnot?: number,
    );
    getPoint(t: number, target?: Vector3): Vector3;
    getTangent(t: number, target?: Vector3): Vector3;
  }
}

declare module "three/addons/curves/NURBSSurface.js" {
  import type { Vector2, Vector3, Vector4 } from "three";

  export class NURBSSurface {
    constructor(
      degree1: number,
      degree2: number,
      knots1: number[],
      knots2: number[],
      controlPoints: Array<Array<Vector2 | Vector3 | Vector4>>,
    );
    getPoint(t1: number, t2: number, target: Vector3): void;
  }
}
