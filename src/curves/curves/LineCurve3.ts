import { Vector3 } from "../../math/Vector3.ts";
import { Curve } from "../Curve.ts";

/** Three-dimensional straight line segment between two points. */
export class LineCurve3 extends Curve {
  /** Serialization discriminator for this runtime type. */
  override type: string = "LineCurve3";
  /** Boolean type guard for this THREE.js-compatible curve type. */
  readonly isLineCurve3 = true;
  readonly #v1: Vector3;
  readonly #v2: Vector3;

  /** Constructs a 3D line segment from `v1` to `v2`. */
  constructor(v1: Vector3 = new Vector3(), v2: Vector3 = new Vector3()) {
    super();
    this.#v1 = v1.clone();
    this.#v2 = v2.clone();
  }

  /** Mutable curve start point. Component edits require `updateArcLengths()`. */
  get v1(): Vector3 {
    return this.#v1;
  }

  /** Copies a start point and invalidates cached lengths. */
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

  /** Evaluates the line at normalized parameter `t` in `[0, 1]`. */
  override getPoint(t: number, target: Vector3 = new Vector3()): Vector3 {
    if (t === 1) return target.copy(this.#v2);
    return target.copy(this.#v2).sub(this.#v1).multiplyScalar(t).add(this.#v1);
  }

  /** Evaluates a line at arc-length fraction `u`; mapping is exact. */
  override getPointAt(u: number, target?: Vector3): Vector3 {
    return this.getPoint(u, target);
  }

  /** Returns this line’s constant unit tangent. */
  override getTangent(_t: number, target: Vector3 = new Vector3()): Vector3 {
    return target.copy(this.#v2).sub(this.#v1).normalize();
  }

  /** Returns this line’s constant tangent at arc-length fraction `u`. */
  override getTangentAt(u: number, target?: Vector3): Vector3 {
    return this.getTangent(u, target);
  }

  /** Exact Euclidean distance between the line endpoints. */
  override get length(): number {
    return this.#v1.distanceTo(this.#v2);
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): LineCurve3 {
    return new LineCurve3(this.#v1, this.#v2).copy(this);
  }

  /** Copies values from another line. */
  override copy(source: LineCurve3): this {
    super.copy(source);
    this.#v1.copy(source.v1);
    this.#v2.copy(source.v2);
    return this;
  }

  /** Serializes line endpoints and base curve settings. */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      v1: [this.#v1.x, this.#v1.y, this.#v1.z],
      v2: [this.#v2.x, this.#v2.y, this.#v2.z],
    };
  }

  /** Restores line endpoints from serialized data. */
  override fromJSON(json: Record<string, unknown>): this {
    super.fromJSON(json);
    const data = json as Record<string, unknown> & {
      v1?: unknown;
      v2?: unknown;
    };
    const v1 = data.v1;
    const v2 = data.v2;
    if (Array.isArray(v1)) this.#v1.fromArray(v1);
    if (Array.isArray(v2)) this.#v2.fromArray(v2);
    this.updateArcLengths();
    return this;
  }
}
