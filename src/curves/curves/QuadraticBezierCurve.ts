import { Vector2 } from "../../math/Vector2.ts";
import { Curve } from "../Curve.ts";

/** 2D quadratic Bezier curve with three control points. */
export class QuadraticBezierCurve extends Curve {
  override type = "QuadraticBezierCurve";
  #v0: Vector2;
  #v1: Vector2;
  #v2: Vector2;

  /**
   * @param v0 Start point
   * @param v1 Control point
   * @param v2 End point
   */
  constructor(
    v0: Vector2 = new Vector2(),
    v1: Vector2 = new Vector2(),
    v2: Vector2 = new Vector2(),
  ) {
    super();
    this.#v0 = v0.clone();
    this.#v1 = v1.clone();
    this.#v2 = v2.clone();
  }

  get v0(): Vector2 {
    return this.#v0;
  }

  get v1(): Vector2 {
    return this.#v1;
  }

  get v2(): Vector2 {
    return this.#v2;
  }

  /** Returns B(t) = (1-t)^2*v0 + 2*(1-t)*t*v1 + t^2*v2. */
  override getPoint(t: number, target: Vector2 = new Vector2()): Vector2 {
    const mt = 1 - t;
    const x =
      mt * mt * this.#v0.x + 2 * mt * t * this.#v1.x + t * t * this.#v2.x;
    const y =
      mt * mt * this.#v0.y + 2 * mt * t * this.#v1.y + t * t * this.#v2.y;
    return target.set(x, y);
  }

  override clone(): QuadraticBezierCurve {
    return new QuadraticBezierCurve(this.#v0, this.#v1, this.#v2);
  }

  override copy(source: QuadraticBezierCurve): this {
    super.copy(source);
    this.#v0.copy(source.v0);
    this.#v1.copy(source.v1);
    this.#v2.copy(source.v2);
    return this;
  }
}
