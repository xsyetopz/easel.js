import { Texture } from "../textures/Texture.js";
import { ImageBitmapLoader } from "./ImageBitmapLoader.js";
import { Loader } from "./Loader.js";

/**
 * Loads an image URL and wraps it in a Texture.
 *
 * Uses fetch + createImageBitmap internally, which avoids canvas taint
 * issues that occur with HTMLImageElement + crossOrigin on 2D canvas
 * renderers that call getImageData().
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
		const loader = new ImageBitmapLoader(this.manager);
		loader.setPath(this.path);
		loader.setRequestHeader(this.requestHeader);

		loader.load(
			url,
			(bitmap) => {
				const texture = new Texture(bitmap);
				texture.needsUpdate = true;
				onLoad?.(texture);
			},
			onProgress,
			onError,
		);
	}
}
