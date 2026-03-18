import { Texture } from "../textures/Texture.js";
import { ImageLoader } from "./ImageLoader.js";
import { Loader } from "./Loader.js";

/**
 * Loads an image URL and wraps it in a Texture.
 */
export class TextureLoader extends Loader {
	/**
	 * @param {*} [manager]
	 */
	constructor(manager = undefined) {
		super(manager);
	}

	/**
	 * @override
	 * @param {string} url
	 * @param {((texture: Texture) => void) | undefined} [onLoad]
	 * @param {((event: ProgressEvent) => void) | undefined} [onProgress]
	 * @param {((err: *) => void) | undefined} [onError]
	 * @returns {void}
	 */
	load(url, onLoad, onProgress = undefined, onError = undefined) {
		const imageLoader = new ImageLoader(this.manager);
		imageLoader.setPath(this.path);
		imageLoader.setCrossOrigin(this.crossOrigin);
		imageLoader.setRequestHeader(this.requestHeader);

		imageLoader.load(
			url,
			(image) => {
				const texture = new Texture(image);
				texture.needsUpdate = true;
				onLoad?.(texture);
			},
			onProgress,
			onError,
		);
	}
}
