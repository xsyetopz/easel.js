const MAX_SIZE = 128;

let _textureId = 0;

/**
 * Texture with a hard 128x128 maximum. On needsUpdate, source images
 * are clamped to 128x128 via nearest-neighbor resampling.
 */
export class Texture {
	/** @type {number} */
	id = _textureId++;

	/** @type {string} */
	name = "";

	/** @type {HTMLImageElement|HTMLCanvasElement|ImageBitmap|undefined} */
	image;

	/** @type {ImageData|null} */
	#data = null;

	#needsUpdate = false;

	/**
	 * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap} [image]
	 */
	constructor(image = undefined) {
		this.image = image;
	}

	/** @returns {boolean} */
	get needsUpdate() {
		return this.#needsUpdate;
	}

	/** @param {boolean} value */
	set needsUpdate(value) {
		if (value) this.#clampAndCache();
		this.#needsUpdate = value;
	}

	/**
	 * Cached pixel data, clamped to 128x128.
	 * @returns {ImageData|null}
	 */
	get data() {
		return this.#data;
	}

	/** @returns {number} */
	get width() {
		return this.#data ? this.#data.width : 0;
	}

	/** @returns {number} */
	get height() {
		return this.#data ? this.#data.height : 0;
	}

	#clampAndCache() {
		if (!this.image) return;

		const src = this.image;
		const sw = src.width || 0;
		const sh = src.height || 0;
		if (sw === 0 || sh === 0) return;

		const dw = Math.min(sw, MAX_SIZE);
		const dh = Math.min(sh, MAX_SIZE);

		const canvas =
			typeof OffscreenCanvas === "undefined"
				? document.createElement("canvas")
				: new OffscreenCanvas(dw, dh);
		canvas.width = dw;
		canvas.height = dh;

		const ctx =
			/** @type {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D|null} */ (
				canvas.getContext("2d")
			);
		if (!ctx) return;
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(src, 0, 0, dw, dh);

		this.#data = ctx.getImageData(0, 0, dw, dh);
	}

	/** @returns {Texture} */
	clone() {
		return new Texture(this.image);
	}

	/** @returns {void} */
	dispose() {
		this.image = undefined;
		this.#data = null;
	}
}
