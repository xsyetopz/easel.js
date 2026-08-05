import { clamp, EPSILON } from "./MathUtils.ts";

/** Spherical coordinate (radius, phi, theta). */
export class Spherical {
  #radius = 1;
  #phi = 0;
  #theta = 0;

  /** Constructs spherical coordinates from radius, polar angle, and azimuth. */
  constructor(radius: number = 1, phi: number = 0, theta: number = 0) {
    this.#radius = radius;
    this.#phi = phi;
    this.#theta = theta;
  }

  /** Radial distance from the origin in world units. */
  get radius(): number {
    return this.#radius;
  }

  /** Replaces the radial distance from the origin in world units. */
  set radius(value: number) {
    this.#radius = value;
  }

  /** Polar angle in radians measured down from the positive Y axis. */
  get phi(): number {
    return this.#phi;
  }

  /** Replaces the polar angle in radians. */
  set phi(value: number) {
    this.#phi = value;
  }

  /** Azimuth angle in radians, measured from the positive Z axis. */
  get theta(): number {
    return this.#theta;
  }

  /** Replaces the azimuth angle in radians. */
  set theta(value: number) {
    this.#theta = value;
  }

  /** Replaces all stored components with the supplied values. */
  set(radius: number, phi: number, theta: number): this {
    this.#radius = radius;
    this.#phi = phi;
    this.#theta = theta;
    return this;
  }

  /** Returns a new instance with the same component values. */
  clone(): Spherical {
    return new Spherical(this.#radius, this.#phi, this.#theta);
  }

  /** Copies component values from the supplied instance into this one. */
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
    const EPS = EPSILON;
    this.#phi = Math.max(EPS, Math.min(Math.PI - EPS, this.#phi));
    return this;
  }

  /** Replaces these coordinates from a Cartesian vector. */
  setFromVector3(v: { x: number; y: number; z: number }): this {
    return this.setFromCartesianCoords(v.x, v.y, v.z);
  }

  /** Replaces these coordinates from Cartesian x, y, and z values. */
  setFromCartesianCoords(x: number, y: number, z: number): this {
    this.#radius = Math.sqrt(x * x + y * y + z * z);
    if (this.#radius === 0) {
      this.#phi = 0;
      this.#theta = 0;
    } else {
      this.#phi = Math.acos(clamp(y / this.#radius, -1, 1));
      this.#theta = Math.atan2(x, z);
    }
    return this;
  }
}
