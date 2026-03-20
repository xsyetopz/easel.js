import { Wrapping } from "../core/Constants.js";

const MAX_SIZE = 128;

let _textureId = 0;

/**
 * Texture with a hard 128x128 maximum. On needsUpdate, source images
 * are clamped to 128x128 via nearest-neighbor resampling.
 */
export class Texture {
	static BRIGHTNESS_LEVELS = 4;

	/** @type {number} */
	id = _textureId++;

	/** @type {string} */
	name = "";

	/** @type {number} */
	wrapS = Wrapping.ClampToEdge;

	/** @type {number} */
	wrapT = Wrapping.ClampToEdge;

	/** @type {HTMLImageElement|HTMLCanvasElement|ImageBitmap|undefined} */
	image;

	/** @type {ImageData|undefined} */
	#data = undefined;

	/** @type {Uint8ClampedArray[] | undefined} */
	#brightnessLevels = undefined;

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
		if (value) {
			this.#clampAndCache();
			this.#brightnessLevels = undefined;
		}
		this.#needsUpdate = value;
	}

	/**
	 * Cached pixel data, clamped to 128x128.
	 * @returns {ImageData|undefined}
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

	/**
	 * Pre-multiplied brightness variants of the texture pixel data.
	 * Lazily built on first access, invalidated on needsUpdate/dispose.
	 * @returns {Uint8ClampedArray[] | undefined}
	 */
	get brightnessLevels() {
		if (!this.data) return undefined;
		if (!this.#brightnessLevels) this.#buildBrightnessLevels();
		return this.#brightnessLevels;
	}

	#buildBrightnessLevels() {
		const imgData = this.data;
		if (!imgData) return;
		const src = imgData.data;
		const len = src.length;
		const N = Texture.BRIGHTNESS_LEVELS;
		const levels = new Array(N);
		for (let i = 0; i < N; i++) {
			const factor = (i + 1) / N;
			const dst = new Uint8ClampedArray(len);
			for (let j = 0; j < len; j += 4) {
				dst[j] = (src[j] * factor + 0.5) | 0;
				dst[j + 1] = (src[j + 1] * factor + 0.5) | 0;
				dst[j + 2] = (src[j + 2] * factor + 0.5) | 0;
				dst[j + 3] = src[j + 3];
			}
			levels[i] = dst;
		}
		this.#brightnessLevels = levels;
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
			/** @type {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D|undefined} */ (
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
		this.#data = undefined;
		this.#brightnessLevels = undefined;
	}
}
