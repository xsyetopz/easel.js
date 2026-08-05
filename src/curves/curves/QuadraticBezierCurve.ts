import { Vector2 } from "../../math/Vector2.ts";
import { Curve } from "../Curve.ts";

/** Two-dimensional quadratic Bezier curve with three control points. */
export class QuadraticBezierCurve extends Curve {
  /** Serialization discriminator for this runtime type. */
  override type: string = "QuadraticBezierCurve";
  /** Boolean type guard for this THREE.js-compatible curve type. */
  readonly isQuadraticBezierCurve = true;
  #v0: Vector2;
  #v1: Vector2;
  #v2: Vector2;

  /** Constructs a 2D quadratic Bezier curve from three control points. */
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

  /** Mutable curve start point. Component edits require `updateArcLengths()`. */
  get v0(): Vector2 {
    return this.#v0;
  }

  /** Copies a start point and invalidates cached lengths. */
  set v0(value: Vector2) {
    this.#v0.copy(value);
    this.updateArcLengths();
  }

  /** Mutable quadratic control point; edits require `updateArcLengths()`. */
  get v1(): Vector2 {
    return this.#v1;
  }

  /** Copies the control point and invalidates cached lengths. */
  set v1(value: Vector2) {
    this.#v1.copy(value);
    this.updateArcLengths();
  }

  /** Mutable curve end point. Component edits require `updateArcLengths()`. */
  get v2(): Vector2 {
    return this.#v2;
  }

  /** Copies an end point and invalidates cached lengths. */
  set v2(value: Vector2) {
    this.#v2.copy(value);
    this.updateArcLengths();
  }

  /** Evaluates the quadratic Bezier curve at normalized parameter `t`. */
  override getPoint(t: number, target: Vector2 = new Vector2()): Vector2 {
    const inverse = 1 - t;
    return target.set(
      inverse * inverse * this.#v0.x +
        2 * inverse * t * this.#v1.x +
        t * t * this.#v2.x,
      inverse * inverse * this.#v0.y +
        2 * inverse * t * this.#v1.y +
        t * t * this.#v2.y,
    );
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): QuadraticBezierCurve {
    return new QuadraticBezierCurve(this.#v0, this.#v1, this.#v2).copy(this);
  }

  /** Copies values from another quadratic curve. */
  override copy(source: QuadraticBezierCurve): this {
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
      v0: [this.#v0.x, this.#v0.y],
      v1: [this.#v1.x, this.#v1.y],
      v2: [this.#v2.x, this.#v2.y],
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
