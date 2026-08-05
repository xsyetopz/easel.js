import { Vector3 } from "../../math/Vector3.ts";
import { Curve } from "../Curve.ts";

/** Three-dimensional quadratic Bezier curve with three control points. */
export class QuadraticBezierCurve3 extends Curve {
  /** Serialization discriminator for this runtime type. */
  override type: string = "QuadraticBezierCurve3";
  /** Boolean type guard for this THREE.js-compatible curve type. */
  readonly isQuadraticBezierCurve3 = true;
  #v0: Vector3;
  #v1: Vector3;
  #v2: Vector3;

  /** Constructs a 3D quadratic Bezier curve from three control points. */
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

  /** Mutable curve start point. Component edits require `updateArcLengths()`. */
  get v0(): Vector3 {
    return this.#v0;
  }

  /** Copies a start point and invalidates cached lengths. */
  set v0(value: Vector3) {
    this.#v0.copy(value);
    this.updateArcLengths();
  }

  /** Mutable quadratic control point; edits require `updateArcLengths()`. */
  get v1(): Vector3 {
    return this.#v1;
  }

  /** Copies the control point and invalidates cached lengths. */
  set v1(value: Vector3) {
    this.#v1.copy(value);
    this.updateArcLengths();
  }

  /** Mutable curve end point. Component edits require `updateArcLengths()`. */
  get v2(): Vector3 {
    return this.#v2;
  }

  /** Copies an end point and invalidates cached lengths. */
  set v2(value: Vector3) {
    this.#v2.copy(value);
    this.updateArcLengths();
  }

  /** Evaluates the quadratic Bezier curve at normalized parameter `t`. */
  override getPoint(t: number, target: Vector3 = new Vector3()): Vector3 {
    const inverse = 1 - t;
    return target.set(
      inverse * inverse * this.#v0.x +
        2 * inverse * t * this.#v1.x +
        t * t * this.#v2.x,
      inverse * inverse * this.#v0.y +
        2 * inverse * t * this.#v1.y +
        t * t * this.#v2.y,
      inverse * inverse * this.#v0.z +
        2 * inverse * t * this.#v1.z +
        t * t * this.#v2.z,
    );
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): QuadraticBezierCurve3 {
    return new QuadraticBezierCurve3(this.#v0, this.#v1, this.#v2).copy(this);
  }

  /** Copies values from another 3D quadratic curve. */
  override copy(source: QuadraticBezierCurve3): this {
    super.copy(source);
    this.#v0.copy(source.v0);
    this.#v1.copy(source.v1);
    this.#v2.copy(source.v2);
    return this;
  }

  /** Serializes quadratic control points and base curve settings. */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      v0: [this.#v0.x, this.#v0.y, this.#v0.z],
      v1: [this.#v1.x, this.#v1.y, this.#v1.z],
      v2: [this.#v2.x, this.#v2.y, this.#v2.z],
    };
  }

  /** Restores quadratic control points from serialized data. */
  override fromJSON(json: Record<string, unknown>): this {
    super.fromJSON(json);
    const v0 = json["v0"];
    const v1 = json["v1"];
    const v2 = json["v2"];
    if (Array.isArray(v0)) this.#v0.fromArray(v0);
    if (Array.isArray(v1)) this.#v1.fromArray(v1);
    if (Array.isArray(v2)) this.#v2.fromArray(v2);
    this.updateArcLengths();
    return this;
  }
}
