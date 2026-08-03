import { Vector3 } from "../../math/Vector3.ts";
import { Curve } from "../Curve.ts";

/** 3D quadratic Bezier curve with three control points. */
export class QuadraticBezierCurve3 extends Curve {
  override type = "QuadraticBezierCurve3";
  #v0: Vector3;
  #v1: Vector3;
  #v2: Vector3;

  /**
   * @param v0 Start point
   * @param v1 Control point
   * @param v2 End point
   */
  constructor(
    v0: Vector3 = new Vector3(),
    v1: Vector3 = new Vector3(),
    v2: Vector3 = new Vector3(),
  ) {
    super();
    this.#v0 = v0.clone();
    this.#v1 = v1.clone();
    this.#v2 = v2.clone();
  }

  get v0(): Vector3 {
    return this.#v0;
  }

  get v1(): Vector3 {
    return this.#v1;
  }

  get v2(): Vector3 {
    return this.#v2;
  }

  /** Returns B(t) = (1-t)^2*v0 + 2*(1-t)*t*v1 + t^2*v2. */
  override getPoint(t: number, target: Vector3 = new Vector3()): Vector3 {
    const mt = 1 - t;
    const x =
      mt * mt * this.#v0.x + 2 * mt * t * this.#v1.x + t * t * this.#v2.x;
    const y =
      mt * mt * this.#v0.y + 2 * mt * t * this.#v1.y + t * t * this.#v2.y;
    const z =
      mt * mt * this.#v0.z + 2 * mt * t * this.#v1.z + t * t * this.#v2.z;
    return target.set(x, y, z);
  }

  override clone(): QuadraticBezierCurve3 {
    return new QuadraticBezierCurve3(this.#v0, this.#v1, this.#v2);
  }

  override copy(source: QuadraticBezierCurve3): this {
    super.copy(source);
    this.#v0.copy(source.v0);
    this.#v1.copy(source.v1);
    this.#v2.copy(source.v2);
    return this;
  }
}
