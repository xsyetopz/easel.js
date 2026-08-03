import { Vector2 } from "../../math/Vector2.ts";
import { Curve } from "../Curve.ts";

/** 2D ellipse or partial ellipse curve. */
export class EllipseCurve extends Curve {
  override type = "EllipseCurve";
  #cx: number;
  #cy: number;
  #xRadius: number;
  #yRadius: number;
  #startAngle: number;
  #endAngle: number;
  #clockwise: boolean;
  #rotation: number;

  constructor(
    cx = 0,
    cy = 0,
    xRadius = 1,
    yRadius = 1,
    startAngle = 0,
    endAngle: number = Math.PI * 2,
    clockwise = false,
    rotation = 0,
  ) {
    super();
    this.#cx = cx;
    this.#cy = cy;
    this.#xRadius = xRadius;
    this.#yRadius = yRadius;
    this.#startAngle = startAngle;
    this.#endAngle = endAngle;
    this.#clockwise = clockwise;
    this.#rotation = rotation;
  }

  get cx(): number {
    return this.#cx;
  }
  get cy(): number {
    return this.#cy;
  }
  get xRadius(): number {
    return this.#xRadius;
  }
  get yRadius(): number {
    return this.#yRadius;
  }
  get startAngle(): number {
    return this.#startAngle;
  }
  get endAngle(): number {
    return this.#endAngle;
  }
  get clockwise(): boolean {
    return this.#clockwise;
  }
  get rotation(): number {
    return this.#rotation;
  }

  /** Returns the point on the ellipse at parameter t. */
  override getPoint(t: number, target: Vector2 = new Vector2()): Vector2 {
    let angle = this.#startAngle + t * (this.#endAngle - this.#startAngle);
    if (this.#clockwise) {
      angle = this.#endAngle - t * (this.#endAngle - this.#startAngle);
    }

    const cos = Math.cos;
    const sin = Math.sin;
    const cosA = cos(angle);
    const sinA = sin(angle);
    const cosR = cos(this.#rotation);
    const sinR = sin(this.#rotation);

    const x =
      this.#cx + this.#xRadius * cosA * cosR - this.#yRadius * sinA * sinR;
    const y =
      this.#cy + this.#xRadius * cosA * sinR + this.#yRadius * sinA * cosR;

    return target.set(x, y);
  }

  override clone(): EllipseCurve {
    return new EllipseCurve(
      this.#cx,
      this.#cy,
      this.#xRadius,
      this.#yRadius,
      this.#startAngle,
      this.#endAngle,
      this.#clockwise,
      this.#rotation,
    );
  }

  override copy(source: EllipseCurve): this {
    super.copy(source);
    this.#cx = source.cx;
    this.#cy = source.cy;
    this.#xRadius = source.xRadius;
    this.#yRadius = source.yRadius;
    this.#startAngle = source.startAngle;
    this.#endAngle = source.endAngle;
    this.#clockwise = source.clockwise;
    this.#rotation = source.rotation;
    return this;
  }
}
