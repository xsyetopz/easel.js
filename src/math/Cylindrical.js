export class Cylindrical {
	#radius = 1;
	#theta = 0;
	#y = 0;

	/**
	 * @param {number} [radius]
	 * @param {number} [theta]
	 * @param {number} [y]
	 */
	constructor(radius = 1, theta = 0, y = 0) {
		this.#radius = radius;
		this.#theta = theta;
		this.#y = y;
	}

	/** @returns {number} */
	get radius() {
		return this.#radius;
	}

	/** @param {number} value */
	set radius(value) {
		this.#radius = value;
	}

	/** @returns {number} */
	get theta() {
		return this.#theta;
	}

	/** @param {number} value */
	set theta(value) {
		this.#theta = value;
	}

	/** @returns {number} */
	get y() {
		return this.#y;
	}

	/** @param {number} value */
	set y(value) {
		this.#y = value;
	}

	/**
	 * @param {number} radius
	 * @param {number} theta
	 * @param {number} y
	 * @returns {this}
	 */
	set(radius, theta, y) {
		this.#radius = radius;
		this.#theta = theta;
		this.#y = y;
		return this;
	}

	/** @returns {Cylindrical} */
	clone() {
		return new Cylindrical(this.#radius, this.#theta, this.#y);
	}

	/**
	 * @param {Cylindrical} c
	 * @returns {this}
	 */
	copy(c) {
		this.#radius = c.radius;
		this.#theta = c.theta;
		this.#y = c.y;
		return this;
	}

	/**
	 * Sets from a Vector3 in Cartesian coordinates.
	 * @param {{ x: number, y: number, z: number }} v
	 * @returns {this}
	 */
	setFromVector3(v) {
		return this.setFromCartesianCoords(v.x, v.y, v.z);
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {this}
	 */
	setFromCartesianCoords(x, y, z) {
		this.#radius = Math.sqrt(x * x + z * z);
		this.#theta = Math.atan2(x, z);
		this.#y = y;
		return this;
	}
}
