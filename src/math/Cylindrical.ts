/** Cylindrical coordinate (radius, theta, y). */
export class Cylindrical {
	#radius = 1;
	#theta = 0;
	#y = 0;

	constructor(radius = 1, theta = 0, y = 0) {
		this.#radius = radius;
		this.#theta = theta;
		this.#y = y;
	}

	get radius(): number {
		return this.#radius;
	}

	set radius(value: number) {
		this.#radius = value;
	}

	get theta(): number {
		return this.#theta;
	}

	set theta(value: number) {
		this.#theta = value;
	}

	get y(): number {
		return this.#y;
	}

	set y(value: number) {
		this.#y = value;
	}

	set(radius: number, theta: number, y: number): this {
		this.#radius = radius;
		this.#theta = theta;
		this.#y = y;
		return this;
	}

	clone(): Cylindrical {
		return new Cylindrical(this.#radius, this.#theta, this.#y);
	}

	copy(c: Cylindrical): this {
		this.#radius = c.radius;
		this.#theta = c.theta;
		this.#y = c.y;
		return this;
	}

	/** Sets from a Vector3 in Cartesian coordinates. */
	setFromVector3(v: { x: number; y: number; z: number }): this {
		return this.setFromCartesianCoords(v.x, v.y, v.z);
	}

	setFromCartesianCoords(x: number, y: number, z: number): this {
		this.#radius = Math.sqrt(x * x + z * z);
		this.#theta = Math.atan2(x, z);
		this.#y = y;
		return this;
	}
}
