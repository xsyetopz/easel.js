import { DepthBuffer } from "./DepthBuffer.js";

/** RGBA pixel buffer backed by an Int32Array. */
export class Framebuffer {
	#width;
	#height;
	#imageData;
	#data;
	#depthBuffer;

	/**
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(width, height) {
		this.#width = width;
		this.#height = height;
		this.#imageData = this.#createImageData(width, height);
		this.#data = this.#imageData.data;
		this.#depthBuffer = new DepthBuffer(width, height);
	}

	/**
	 * @param {number} width
	 * @param {number} height
	 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
	 */
	#createImageData(width, height) {
		if (typeof globalThis.ImageData !== "undefined") {
			return new globalThis.ImageData(width, height);
		}
		return { data: new Uint8ClampedArray(width * height * 4), width, height };
	}

	/** @returns {number} */
	get width() {
		return this.#width;
	}

	/** @returns {number} */
	get height() {
		return this.#height;
	}

	/** @returns {{ data: Uint8ClampedArray, width: number, height: number }} */
	get imageData() {
		return this.#imageData;
	}

	/** @returns {Uint8ClampedArray} */
	get data() {
		return this.#data;
	}

	/** @returns {DepthBuffer} */
	get depthBuffer() {
		return this.#depthBuffer;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} r
	 * @param {number} g
	 * @param {number} b
	 * @param {number} [a]
	 */
	setPixel(x, y, r, g, b, a = 255) {
		const idx = (y * this.#width + x) << 2;
		this.#data[idx] = r;
		this.#data[idx + 1] = g;
		this.#data[idx + 2] = b;
		this.#data[idx + 3] = a;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @returns {{ r: number, g: number, b: number, a: number }}
	 */
	getPixel(x, y) {
		const idx = (y * this.#width + x) << 2;
		return {
			r: this.#data[idx],
			g: this.#data[idx + 1],
			b: this.#data[idx + 2],
			a: this.#data[idx + 3],
		};
	}

	/**
	 * @param {number} width
	 * @param {number} height
	 */
	resize(width, height) {
		this.#width = width;
		this.#height = height;
		this.#imageData = this.#createImageData(width, height);
		this.#data = this.#imageData.data;
		this.#depthBuffer.resize(width, height);
	}
}
