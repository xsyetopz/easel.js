import { MathUtils } from "./MathUtils.js";

export class Spherical {
	#radius = 1;
	#phi = 0;
	#theta = 0;

	/**
	 * @param {number} [radius]
	 * @param {number} [phi]
	 * @param {number} [theta]
	 */
	constructor(radius = 1, phi = 0, theta = 0) {
		this.#radius = radius;
		this.#phi = phi;
		this.#theta = theta;
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
	get phi() {
		return this.#phi;
	}

	/** @param {number} value */
	set phi(value) {
		this.#phi = value;
	}

	/** @returns {number} */
	get theta() {
		return this.#theta;
	}

	/** @param {number} value */
	set theta(value) {
		this.#theta = value;
	}

	/**
	 * @param {number} radius
	 * @param {number} phi
	 * @param {number} theta
	 * @returns {this}
	 */
	set(radius, phi, theta) {
		this.#radius = radius;
		this.#phi = phi;
		this.#theta = theta;
		return this;
	}

	/** @returns {Spherical} */
	clone() {
		return new Spherical(this.#radius, this.#phi, this.#theta);
	}

	/**
	 * @param {Spherical} s
	 * @returns {this}
	 */
	copy(s) {
		this.#radius = s.radius;
		this.#phi = s.phi;
		this.#theta = s.theta;
		return this;
	}

	/**
	 * Restricts phi to [EPS, PI - EPS] to avoid singularities at poles.
	 * @returns {this}
	 */
	makeSafe() {
		const EPS = MathUtils.EPSILON;
		this.#phi = Math.max(EPS, Math.min(Math.PI - EPS, this.#phi));
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
