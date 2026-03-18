import { InterleavedBuffer } from "./InterleavedBuffer.js";

export class InterleavedAttribute {
	#data;
	#itemSize;
	#offset;

	/** @type {boolean} */
	needsUpdate = false;

	/**
	 * @param {InterleavedBuffer} data
	 * @param {number} itemSize
	 * @param {number} offset
	 */
	constructor(data, itemSize, offset) {
		this.#data = data;
		this.#itemSize = itemSize;
		this.#offset = offset;
	}

	/** @returns {InterleavedBuffer} */
	get data() {
		return this.#data;
	}

	/** @returns {number} */
	get itemSize() {
		return this.#itemSize;
	}

	/** @returns {number} */
	get offset() {
		return this.#offset;
	}

	/** @returns {number} */
	get count() {
		return this.#data.count;
	}

	/** @returns {Float32Array|Int32Array|Uint32Array|Uint16Array} */
	get array() {
		return this.#data.array;
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getX(index) {
		return this.#data.array[index * this.#data.stride + this.#offset];
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getY(index) {
		return this.#data.array[index * this.#data.stride + this.#offset + 1];
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getZ(index) {
		return this.#data.array[index * this.#data.stride + this.#offset + 2];
	}

	/**
	 * @param {number} index
	 * @returns {number}
	 */
	getW(index) {
		return this.#data.array[index * this.#data.stride + this.#offset + 3];
	}

	/**
	 * @param {number} index
	 * @param {number} x
	 * @returns {this}
	 */
	setX(index, x) {
		this.#data.array[index * this.#data.stride + this.#offset] = x;
		return this;
	}

	/**
	 * @param {number} index
	 * @param {number} y
	 * @returns {this}
	 */
	setY(index, y) {
		this.#data.array[index * this.#data.stride + this.#offset + 1] = y;
		return this;
	}

	/**
	 * @param {number} index
	 * @param {number} z
	 * @returns {this}
	 */
	setZ(index, z) {
		this.#data.array[index * this.#data.stride + this.#offset + 2] = z;
		return this;
	}

	/**
	 * @param {number} index
	 * @param {number} w
	 * @returns {this}
	 */
	setW(index, w) {
		this.#data.array[index * this.#data.stride + this.#offset + 3] = w;
		return this;
	}
}
