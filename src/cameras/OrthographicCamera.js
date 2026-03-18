import { Camera } from "./Camera.js";

/**
 * Orthographic projection camera.
 */
export class OrthographicCamera extends Camera {
	/** @override @type {string} */
	type = "OrthographicCamera";

	#left;
	#right;
	#top;
	#bottom;

	/**
	 * @param {object} [options]
	 * @param {number} [options.left=-1]
	 * @param {number} [options.right=1]
	 * @param {number} [options.top=1]
	 * @param {number} [options.bottom=-1]
	 * @param {number} [options.near=0.1]
	 * @param {number} [options.far=2000]
	 * @param {number} [options.tileSize=1]
	 */
	constructor({
		left = -1,
		right = 1,
		top = 1,
		bottom = -1,
		near = 0.1,
		far = 2000,
		tileSize = 1,
	} = {}) {
		super({ near, far, tileSize });
		this.#left = left;
		this.#right = right;
		this.#top = top;
		this.#bottom = bottom;
		this.updateProjectionMatrix();
	}

	/** @returns {number} */
	get left() {
		return this.#left;
	}

	/** @param {number} value */
	set left(value) {
		this.#left = value;
	}

	/** @returns {number} */
	get right() {
		return this.#right;
	}

	/** @param {number} value */
	set right(value) {
		this.#right = value;
	}

	/** @returns {number} */
	get top() {
		return this.#top;
	}

	/** @param {number} value */
	set top(value) {
		this.#top = value;
	}

	/** @returns {number} */
	get bottom() {
		return this.#bottom;
	}

	/** @param {number} value */
	set bottom(value) {
		this.#bottom = value;
	}

	/** @override @returns {void} */
	updateProjectionMatrix() {
		this.projectionMatrix.makeOrthographic(
			this.#left,
			this.#right,
			this.#top,
			this.#bottom,
			this.near,
			this.far,
		);
	}

	/** @override @returns {OrthographicCamera} */
	clone() {
		return new OrthographicCamera({
			left: this.#left,
			right: this.#right,
			top: this.#top,
			bottom: this.#bottom,
			near: this.near,
			far: this.far,
			tileSize: this.tileSize,
		});
	}

	/**
	 * @override
	 * @param {Camera} source
	 * @param {boolean} [recursive=true]
	 * @returns {this}
	 */
	copy(source, recursive = true) {
		super.copy(source, recursive);
		if (!(source instanceof OrthographicCamera)) return this;
		this.#left = source.left;
		this.#right = source.right;
		this.#top = source.top;
		this.#bottom = source.bottom;
		return this;
	}
}
