import { Texture } from "./Texture.js";

/**
 * Texture created from raw pixel data.
 */
export class DataTexture extends Texture {
	/** @type {ImageData|undefined} */
	#imageData = undefined;

	/**
	 * @param {Uint8ClampedArray} data RGBA pixel data.
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(data, width, height) {
		super(undefined);
		this.#imageData = new ImageData(
			/** @type {Uint8ClampedArray<ArrayBuffer>} */ (data),
			width,
			height,
		);
	}

	/** @override @returns {ImageData|undefined} */
	get data() {
		return this.#imageData;
	}

	/** @override @returns {number} */
	get width() {
		return this.#imageData ? this.#imageData.width : 0;
	}

	/** @override @returns {number} */
	get height() {
		return this.#imageData ? this.#imageData.height : 0;
	}

	/** @override @returns {void} */
	dispose() {
		this.#imageData = undefined;
		super.dispose();
	}
}
