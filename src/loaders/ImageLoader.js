import { Loader } from "./Loader.js";
import { DefaultLoadingManager } from "./LoadingManager.js";

/**
 * Loads an image as an HTMLImageElement.
 */
export class ImageLoader extends Loader {
	/**
	 * @param {*} [manager]
	 */
	constructor(manager = undefined) {
		super(manager);
	}

	/**
	 * @override
	 * @param {string} url
	 * @param {((image: HTMLImageElement) => void) | undefined} [onLoad]
	 * @param {((event: ProgressEvent) => void) | undefined} [_onProgress]
	 * @param {((err: *) => void) | undefined} [onError]
	 * @returns {void}
	 */
	load(url, onLoad, _onProgress = undefined, onError = undefined) {
		const manager = this.manager ?? DefaultLoadingManager;
		const fullUrl = this.path + url;

		manager.itemStart(fullUrl);

		const image = new Image();
		if (this.crossOrigin) {
			image.crossOrigin = this.crossOrigin;
		}

		image.onload = () => {
			onLoad?.(image);
			manager.itemEnd(fullUrl);
		};

		image.onerror = (err) => {
			onError?.(err);
			manager.itemError(fullUrl);
		};

		image.src = fullUrl;
	}
}
