import { Attribute } from "../geometry/Attribute.js";
import { Geometry } from "../geometry/Geometry.js";
import { FileLoader } from "./FileLoader.js";
import { Loader } from "./Loader.js";

/**
 * Loads a JSON geometry definition and returns a Geometry instance.
 */
export class GeometryLoader extends Loader {
	/**
	 * @param {*} [manager]
	 */
	constructor(manager = undefined) {
		super(manager);
	}

	/**
	 * @override
	 * @param {string} url
	 * @param {((geometry: Geometry) => void) | undefined} [onLoad]
	 * @param {((event: ProgressEvent) => void) | undefined} [onProgress]
	 * @param {((err: *) => void) | undefined} [onError]
	 * @returns {void}
	 */
	load(url, onLoad, onProgress = undefined, onError = undefined) {
		const fileLoader = new FileLoader(this.manager);
		fileLoader.setPath(this.path);
		fileLoader.setResponseType("json");
		fileLoader.setRequestHeader(this.requestHeader);

		fileLoader.load(
			url,
			(json) => {
				onLoad?.(this.parse(json));
			},
			onProgress,
			onError,
		);
	}

	/**
	 * @param {{ attributes: Record<string, { array: number[], itemSize: number }>, index?: { array: number[] } }} json
	 * @returns {Geometry}
	 */
	parse(json) {
		const geometry = new Geometry();

		for (const [name, attribData] of Object.entries(json.attributes ?? {})) {
			const array = new Float32Array(attribData.array);
			geometry.setAttribute(name, new Attribute(array, attribData.itemSize));
		}

		if (json.index) {
			geometry.setIndex(json.index.array);
		}

		return geometry;
	}
}
