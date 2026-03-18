import { DataTexture } from "../textures/DataTexture.js";
import { FileLoader } from "./FileLoader.js";
import { Loader } from "./Loader.js";

/**
 * Base loader for raw data → DataTexture.
 * Subclasses override parse() to handle specific formats.
 */
export class DataTextureLoader extends Loader {
	/**
	 * @param {*} [manager]
	 */
	constructor(manager = undefined) {
		super(manager);
	}

	/**
	 * @override
	 * @param {string} url
	 * @param {((texture: DataTexture) => void) | undefined} [onLoad]
	 * @param {((event: ProgressEvent) => void) | undefined} [onProgress]
	 * @param {((err: *) => void) | undefined} [onError]
	 * @returns {void}
	 */
	load(url, onLoad, onProgress = undefined, onError = undefined) {
		const fileLoader = new FileLoader(this.manager);
		fileLoader.setPath(this.path);
		fileLoader.setResponseType("arraybuffer");
		fileLoader.setRequestHeader(this.requestHeader);

		fileLoader.load(
			url,
			(buffer) => {
				const result = this.parse(buffer);
				if (!result) return;
				const texture = new DataTexture(
					result.data,
					result.width,
					result.height,
				);
				texture.needsUpdate = true;
				onLoad?.(texture);
			},
			onProgress,
			onError,
		);
	}

	/**
	 * Abstract — subclasses override to decode buffer.
	 * @param {ArrayBuffer} _data
	 * @returns {{ data: Uint8ClampedArray, width: number, height: number } | null}
	 */
	parse(_data) {
		return null;
	}
}
