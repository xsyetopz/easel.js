import { CylinderGeometry } from "./CylinderGeometry.ts";

/** Cone geometry with a zero top radius and optional base cap. */
export class ConeGeometry extends CylinderGeometry {
  /** Constructs a cone with an optional base cap and angular span. */
  constructor(
    radius: number = 1,
    height: number = 1,
    radialSegments: number = 32,
    heightSegments: number = 1,
    openEnded: boolean = false,
    thetaStart: number = 0,
    thetaLength: number = Math.PI * 2,
  ) {
    super(
      0,
      radius,
      height,
      radialSegments,
      heightSegments,
      openEnded,
      thetaStart,
      thetaLength,
    );

    this.type = "ConeGeometry";
    this.parameters = {
      radius,
      height,
      radialSegments,
      heightSegments,
      openEnded,
      thetaStart,
      thetaLength,
    };
  }
}
