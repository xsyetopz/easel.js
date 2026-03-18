import { FileLoader } from "./FileLoader.js";
import { Loader } from "./Loader.js";

/**
 * Loads a JSON material definition and returns a material instance.
 */
export class MaterialLoader extends Loader {
	/**
	 * @param {*} [manager]
	 */
	constructor(manager = undefined) {
		super(manager);
	}

	/**
	 * @override
	 * @param {string} url
	 * @param {((material: *) => void) | undefined} [onLoad]
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
	 * @param {Record<string, *>} json
	 * @returns {*}
	 */
	parse(json) {
		let material;

		switch (json["type"]) {
			case "BasicMaterial":
			case "LambertMaterial":
			case "PhongMaterial":
			case "StandardMaterial": {
				material = Object.assign(Object.create(null), { type: json["type"] });
				break;
			}
			default:
				console.warn(`MaterialLoader: unsupported type "${json["type"]}"`);
				material = Object.assign(Object.create(null), {
					type: json["type"] ?? "Material",
				});
				break;
		}

		const skip = new Set(["type"]);
		for (const [key, value] of Object.entries(json)) {
			if (!skip.has(key)) {
				material[key] = value;
			}
		}

		return material;
	}
}
