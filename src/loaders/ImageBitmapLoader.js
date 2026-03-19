import { Loader } from "./Loader.js";
import { DefaultLoadingManager } from "./LoadingManager.js";

/**
 * Loads an image as an ImageBitmap.
 */
export class ImageBitmapLoader extends Loader {
	/** @type {Record<string, *>} */
	#options = {};

	/**
	 * @param {*} [manager]
	 */
	constructor(manager = undefined) {
		super(manager);
	}

	/**
	 * @param {Record<string, *>} options
	 * @returns {this}
	 */
	setOptions(options) {
		this.#options = options;
		return this;
	}

	/**
	 * @override
	 * @param {string} url
	 * @param {((bitmap: ImageBitmap) => void) | undefined} [onLoad]
	 * @param {((event: ProgressEvent) => void) | undefined} [_onProgress]
	 * @param {((err: *) => void) | undefined} [onError]
	 * @returns {void}
	 */
	load(url, onLoad, _onProgress = undefined, onError = undefined) {
		const manager = this.manager ?? DefaultLoadingManager;
		const fullUrl = this.path + url;
		const options = this.#options;

		manager.itemStart(fullUrl);

		fetch(fullUrl, { headers: { Accept: "image/*", ...this.requestHeader } })
			.then((response) => {
				if (!response.ok) {
					throw new Error(
						`ImageBitmapLoader: fetch failed - ${response.status} ${response.statusText}`,
					);
				}
				return response.blob();
			})
			.then((blob) => createImageBitmap(blob, options))
			.then((bitmap) => {
				onLoad?.(bitmap);
				manager.itemEnd(fullUrl);
			})
			.catch((err) => {
				onError?.(err);
				manager.itemError(fullUrl);
			});
	}
}
