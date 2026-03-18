/**
 * Typed array wrapper for a single vertex data channel.
 */
export class Attribute {
	/** @type {Float32Array|Uint16Array|Uint32Array} */
	#array;

	/** @type {number} */
	#itemSize;

	/** @type {boolean} */
	needsUpdate = false;

	/**
	 * @param {Float32Array|Uint16Array|Uint32Array|number[]} array
	 * @param {number} itemSize
	 */
	constructor(array, itemSize) {
		this.#array = Array.isArray(array) ? new Float32Array(array) : array;
		this.#itemSize = itemSize;
	}

	/** @returns {Float32Array|Uint16Array|Uint32Array} */
	get array() {
		return this.#array;
	}

	/** @returns {number} */
	get itemSize() {
		return this.#itemSize;
	}

	/** @returns {number} */
	get count() {
		return this.#array.length / this.#itemSize;
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getX(index) {
		return this.#array[index * this.#itemSize];
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getY(index) {
		return this.#array[index * this.#itemSize + 1];
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getZ(index) {
		return this.#array[index * this.#itemSize + 2];
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getW(index) {
		return this.#array[index * this.#itemSize + 3];
	}

	/**
	 * @param {number} index
	 * @param {number} x
	 * @returns {this}
	 */
	setX(index, x) {
		this.#array[index * this.#itemSize] = x;
		return this;
	}

	/**
	 * @param {number} index
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	setXY(index, x, y) {
		const i = index * this.#itemSize;
		this.#array[i] = x;
		this.#array[i + 1] = y;
		return this;
	}

	/**
	 * @param {number} index
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {this}
	 */
	setXYZ(index, x, y, z) {
		const i = index * this.#itemSize;
		this.#array[i] = x;
		this.#array[i + 1] = y;
		this.#array[i + 2] = z;
		return this;
	}

	/**
	 * @param {number} index
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} w
	 * @returns {this}
	 */
	setXYZW(index, x, y, z, w) {
		const i = index * this.#itemSize;
		this.#array[i] = x;
		this.#array[i + 1] = y;
		this.#array[i + 2] = z;
		this.#array[i + 3] = w;
		return this;
	}

	/**
	 * @returns {Attribute}
	 */
	clone() {
		return new Attribute(this.#array.slice(), this.#itemSize);
	}
}
