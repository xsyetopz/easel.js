export class DepthBuffer {
	#width;
	#height;
	#data;

	/**
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(width, height) {
		this.#width = width;
		this.#height = height;
		this.#data = new Uint16Array(width * height);
		this.#data.fill(0xffff);
	}

	/** @returns {number} */
	get width() {
		return this.#width;
	}

	/** @returns {number} */
	get height() {
		return this.#height;
	}

	/** @returns {Uint16Array} */
	get data() {
		return this.#data;
	}

	/** Clears all depth values to far plane (0xFFFF). */
	clear() {
		this.#data.fill(0xffff);
	}

	/**
	 * Tests a fragment's depth against the stored value and updates if closer.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} depth Uint16 depth value (0 = near, 65535 = far)
	 * @returns {boolean} true if the fragment passes (is closer than stored)
	 */
	testAndSet(x, y, depth) {
		const idx = y * this.#width + x;
		if (depth > this.#data[idx]) return false;
		this.#data[idx] = depth;
		return true;
	}

	/**
	 * @param {number} width
	 * @param {number} height
	 */
	resize(width, height) {
		this.#width = width;
		this.#height = height;
		this.#data = new Uint16Array(width * height);
		this.#data.fill(0xffff);
	}
}
