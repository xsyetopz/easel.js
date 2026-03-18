/**
 * Reads a region of the current framebuffer into a texture for a
 * subsequent draw pass. CPU render-to-texture.
 */
export class FramebufferTexture {
	/** @type {ImageData|undefined} */
	#data = undefined;

	#width;
	#height;

	/**
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(width, height) {
		this.#width = width;
		this.#height = height;
	}

	/** @returns {number} */
	get width() {
		return this.#width;
	}

	/** @returns {number} */
	get height() {
		return this.#height;
	}

	/** @returns {ImageData|undefined} */
	get data() {
		return this.#data;
	}

	/**
	 * Capture a region from the given ImageData source.
	 * @param {ImageData} source Full framebuffer pixel data.
	 * @param {number} [x=0]
	 * @param {number} [y=0]
	 * @returns {void}
	 */
	capture(source, x = 0, y = 0) {
		const w = this.#width;
		const h = this.#height;
		const pixels = new Uint8ClampedArray(w * h * 4);
		const srcData = source.data;
		const srcW = source.width;

		for (let row = 0; row < h; row++) {
			const srcOffset = ((y + row) * srcW + x) * 4;
			const dstOffset = row * w * 4;
			for (let col = 0; col < w * 4; col++) {
				pixels[dstOffset + col] = srcData[srcOffset + col];
			}
		}

		this.#data = new ImageData(pixels, w, h);
	}

	/** @returns {void} */
	dispose() {
		this.#data = undefined;
	}
}
