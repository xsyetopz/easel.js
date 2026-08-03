import { MathUtils } from "./MathUtils.ts";

/** Spherical coordinate (radius, phi, theta). */
export class Spherical {
  #radius = 1;
  #phi = 0;
  #theta = 0;

  constructor(radius = 1, phi = 0, theta = 0) {
    this.#radius = radius;
    this.#phi = phi;
    this.#theta = theta;
  }

  get radius(): number {
    return this.#radius;
  }

  set radius(value: number) {
    this.#radius = value;
  }

  get phi(): number {
    return this.#phi;
  }

  set phi(value: number) {
    this.#phi = value;
  }

  get theta(): number {
    return this.#theta;
  }

  set theta(value: number) {
    this.#theta = value;
  }

  set(radius: number, phi: number, theta: number): this {
    this.#radius = radius;
    this.#phi = phi;
    this.#theta = theta;
    return this;
  }

  clone(): Spherical {
    return new Spherical(this.#radius, this.#phi, this.#theta);
  }

  copy(s: Spherical): this {
    this.#radius = s.radius;
    this.#phi = s.phi;
    this.#theta = s.theta;
    return this;
  }

  /**
   * Restricts phi to [EPS, PI - EPS] to avoid singularities at poles.
   */
  makeSafe(): this {
    const EPS = MathUtils.EPSILON;
    this.#phi = Math.max(EPS, Math.min(Math.PI - EPS, this.#phi));
    return this;
  }

  /** Sets from a Vector3 in Cartesian coordinates. */
  setFromVector3(v: { x: number; y: number; z: number }): this {
    return this.setFromCartesianCoords(v.x, v.y, v.z);
  }

  setFromCartesianCoords(x: number, y: number, z: number): this {
    this.#radius = Math.sqrt(x * x + y * y + z * z);
    if (this.#radius === 0) {
      this.#phi = 0;
      this.#theta = 0;
    } else {
      this.#phi = Math.acos(MathUtils.clamp(y / this.#radius, -1, 1));
      this.#theta = Math.atan2(x, z);
    }
    return this;
  }
}
