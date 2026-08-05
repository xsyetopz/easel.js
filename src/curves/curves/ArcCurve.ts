import { EllipseCurve } from "./EllipseCurve.ts";

/** Circular arc represented by an ellipse with equal radii. */
export class ArcCurve extends EllipseCurve {
  /** Serialization discriminator for this runtime type. */
  override type: string = "ArcCurve";
  /** Boolean type guard for this THREE.js-compatible curve type. */
  readonly isArcCurve = true;

  /** Constructs a circular arc with equal x and y radii. */
  constructor(
    cx: number = 0,
    cy: number = 0,
    radius: number = 1,
    startAngle: number = 0,
    endAngle: number = Math.PI * 2,
    clockwise: boolean = false,
  ) {
    super(cx, cy, radius, radius, startAngle, endAngle, clockwise);
  }

  /** Returns an independent copy of this arc and its curve settings. */
  override clone(): ArcCurve {
    return new ArcCurve(
      this.cx,
      this.cy,
      this.xRadius,
      this.startAngle,
      this.endAngle,
      this.clockwise,
    ).copy(this);
  }
}
