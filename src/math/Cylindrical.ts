/** Cylindrical coordinate (radius, theta, y). */
export class Cylindrical {
  #radius = 1;
  #theta = 0;
  #y = 0;

  /** Constructs cylindrical coordinates from radius, azimuth, and height. */
  constructor(radius: number = 1, theta: number = 0, y: number = 0) {
    this.#radius = radius;
    this.#theta = theta;
    this.#y = y;
  }

  /** Distance from the Y axis in world units. */
  get radius(): number {
    return this.#radius;
  }

  /** Replaces the distance from the Y axis in world units. */
  set radius(value: number) {
    this.#radius = value;
  }

  /** Azimuth angle in radians, measured from the positive Z axis. */
  get theta(): number {
    return this.#theta;
  }

  /** Replaces the azimuth angle in radians. */
  set theta(value: number) {
    this.#theta = value;
  }

  /** Vertical Cartesian component. */
  get y(): number {
    return this.#y;
  }

  /** Replaces the Cartesian y component. */
  set y(value: number) {
    this.#y = value;
  }

  /** Replaces all stored components with the supplied values. */
  set(radius: number, theta: number, y: number): this {
    this.#radius = radius;
    this.#theta = theta;
    this.#y = y;
    return this;
  }

  /** Returns a new instance with the same component values. */
  clone(): Cylindrical {
    return new Cylindrical(this.#radius, this.#theta, this.#y);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(c: Cylindrical): this {
    this.#radius = c.radius;
    this.#theta = c.theta;
    this.#y = c.y;
    return this;
  }

  /** Replaces these coordinates from a Cartesian vector. */
  setFromVector3(v: { x: number; y: number; z: number }): this {
    return this.setFromCartesianCoords(v.x, v.y, v.z);
  }

  /** Replaces these coordinates from Cartesian x, y, and z values. */
  setFromCartesianCoords(x: number, y: number, z: number): this {
    this.#radius = Math.sqrt(x * x + z * z);
    this.#theta = Math.atan2(x, z);
    this.#y = y;
    return this;
  }
}
