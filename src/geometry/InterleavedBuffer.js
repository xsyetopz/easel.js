export class InterleavedBuffer {
	#array;
	#stride;

	/** @type {boolean} */
	needsUpdate = false;

	/** @type {{ offset: number, count: number }} */
	updateRange = { offset: 0, count: -1 };

	/**
	 * @param {Float32Array|Int32Array|Uint32Array|Uint16Array} array
	 * @param {number} stride
	 */
	constructor(array, stride) {
		this.#array = array;
		this.#stride = stride;
	}

	/** @returns {Float32Array|Int32Array|Uint32Array|Uint16Array} */
	get array() {
		return this.#array;
	}

	/** @returns {number} */
	get stride() {
		return this.#stride;
	}

	/** @returns {number} */
	get count() {
		return this.#array.length / this.#stride;
	}

	/** @returns {InterleavedBuffer} */
	clone() {
		return new InterleavedBuffer(this.#array.slice(), this.#stride);
	}

	/**
	 * @param {InterleavedBuffer} source
	 * @returns {this}
	 */
	copy(source) {
		this.#array.set(source.array);
		return this;
	}

	/**
	 * @param {ArrayLike<number>} value
	 * @param {number} offset
	 * @returns {this}
	 */
	set(value, offset) {
		this.#array.set(value, offset);
		return this;
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getX(index) {
		return this.#array[index * this.#stride];
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getY(index) {
		return this.#array[index * this.#stride + 1];
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getZ(index) {
		return this.#array[index * this.#stride + 2];
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getW(index) {
		return this.#array[index * this.#stride + 3];
	}
}
