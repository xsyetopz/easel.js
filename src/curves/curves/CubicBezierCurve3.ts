import { Vector3 } from "../../math/Vector3.ts";
import { Curve } from "../Curve.ts";

/** Three-dimensional cubic Bezier curve with four control points. */
export class CubicBezierCurve3 extends Curve {
  /** Serialization discriminator for this runtime type. */
  override type: string = "CubicBezierCurve3";
  /** Boolean type guard for this THREE.js-compatible curve type. */
  readonly isCubicBezierCurve3 = true;
  readonly #v0: Vector3;
  readonly #v1: Vector3;
  readonly #v2: Vector3;
  readonly #v3: Vector3;

  /** Constructs a 3D cubic Bezier curve from four control points. */
  constructor(
    v0: Vector3 = new Vector3(),
    v1: Vector3 = new Vector3(),
    v2: Vector3 = new Vector3(),
    v3: Vector3 = new Vector3(),
  ) {
    super();
    this.#v0 = v0.clone();
    this.#v1 = v1.clone();
    this.#v2 = v2.clone();
    this.#v3 = v3.clone();
  }

  /** Mutable curve start point. Component edits require `updateArcLengths()`. */
  get v0(): Vector3 {
    return this.#v0;
  }

  /** Copies a start point and invalidates cached lengths. */
  set v0(value: Vector3) {
    this.#v0.copy(value);
    this.updateArcLengths();
  }

  /** First mutable Bezier control point; edits require `updateArcLengths()`. */
  get v1(): Vector3 {
    return this.#v1;
  }

  /** Copies the first control point and invalidates cached lengths. */
  set v1(value: Vector3) {
    this.#v1.copy(value);
    this.updateArcLengths();
  }

  /** Second mutable Bezier control point; edits require `updateArcLengths()`. */
  get v2(): Vector3 {
    return this.#v2;
  }

  /** Copies the second control point and invalidates cached lengths. */
  set v2(value: Vector3) {
    this.#v2.copy(value);
    this.updateArcLengths();
  }

  /** Mutable curve end point. Component edits require `updateArcLengths()`. */
  get v3(): Vector3 {
    return this.#v3;
  }

  /** Copies an end point and invalidates cached lengths. */
  set v3(value: Vector3) {
    this.#v3.copy(value);
    this.updateArcLengths();
  }

  /** Evaluates the cubic Bezier curve at normalized parameter `t`. */
  override getPoint(t: number, target: Vector3 = new Vector3()): Vector3 {
    const inverse = 1 - t;
    const inverseSquared = inverse * inverse;
    const tSquared = t * t;
    return target.set(
      inverseSquared * inverse * this.#v0.x +
        3 * inverseSquared * t * this.#v1.x +
        3 * inverse * tSquared * this.#v2.x +
        tSquared * t * this.#v3.x,
      inverseSquared * inverse * this.#v0.y +
        3 * inverseSquared * t * this.#v1.y +
        3 * inverse * tSquared * this.#v2.y +
        tSquared * t * this.#v3.y,
      inverseSquared * inverse * this.#v0.z +
        3 * inverseSquared * t * this.#v1.z +
        3 * inverse * tSquared * this.#v2.z +
        tSquared * t * this.#v3.z,
    );
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): CubicBezierCurve3 {
    return new CubicBezierCurve3(this.#v0, this.#v1, this.#v2, this.#v3).copy(
      this,
    );
  }

  /** Copies values from another 3D cubic curve. */
  override copy(source: CubicBezierCurve3): this {
    super.copy(source);
    this.#v0.copy(source.v0);
    this.#v1.copy(source.v1);
    this.#v2.copy(source.v2);
    this.#v3.copy(source.v3);
    return this;
  }

  /** Serializes cubic control points and base curve settings. */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      v0: [this.#v0.x, this.#v0.y, this.#v0.z],
      v1: [this.#v1.x, this.#v1.y, this.#v1.z],
      v2: [this.#v2.x, this.#v2.y, this.#v2.z],
      v3: [this.#v3.x, this.#v3.y, this.#v3.z],
    };
  }

  /** Restores cubic control points from serialized data. */
  override fromJSON(json: Record<string, unknown>): this {
    super.fromJSON(json);
    const data = json as Record<string, unknown> & {
      v0?: unknown;
      v1?: unknown;
      v2?: unknown;
      v3?: unknown;
    };
    const v0 = data.v0;
    const v1 = data.v1;
    const v2 = data.v2;
    const v3 = data.v3;
    if (Array.isArray(v0)) this.#v0.fromArray(v0);
    if (Array.isArray(v1)) this.#v1.fromArray(v1);
    if (Array.isArray(v2)) this.#v2.fromArray(v2);
    if (Array.isArray(v3)) this.#v3.fromArray(v3);
    this.updateArcLengths();
    return this;
  }
}
