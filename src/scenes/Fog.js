import { Color } from "../math/Color.js";

/**
 * Linear fog that blends fragment colors toward a configurable color based on
 * camera-space depth. Objects at `near` are unaffected; objects at `far` are
 * fully fogged.
 */
export class Fog {
	/** @type {Color} */
	#color;

	/** @type {number} */
	#near;

	/** @type {number} */
	#far;

	/**
	 * @param {{ color?: Color|number|string, near?: number, far?: number }} [options]
	 */
	constructor({ color = 0x000000, near = 1, far = 100 } = {}) {
		this.#color = color instanceof Color ? color : new Color(color);
		this.#near = near;
		this.#far = far;
	}

	/** @returns {Color} */
	get color() {
		return this.#color;
	}

	/** @returns {number} */
	get near() {
		return this.#near;
	}

	/** @param {number} value */
	set near(value) {
		this.#near = value;
	}

	/** @returns {number} */
	get far() {
		return this.#far;
	}

	/** @param {number} value */
	set far(value) {
		this.#far = value;
	}

	/** @returns {Fog} */
	clone() {
		return new Fog({
			color: this.#color.clone(),
			near: this.#near,
			far: this.#far,
		});
	}
}
