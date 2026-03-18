import { Node } from "../core/Node.js";
import { FileLoader } from "./FileLoader.js";
import { Loader } from "./Loader.js";

/**
 * Loads a JSON scene graph and returns a Node hierarchy.
 */
export class ObjectLoader extends Loader {
	/**
	 * @param {*} [manager]
	 */
	constructor(manager = undefined) {
		super(manager);
	}

	/**
	 * @override
	 * @param {string} url
	 * @param {((node: Node) => void) | undefined} [onLoad]
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
	 * @returns {Node}
	 */
	parse(json) {
		return this.parseObject(json);
	}

	/**
	 * Recursively builds a Node from a JSON object definition.
	 * @param {Record<string, *>} json
	 * @returns {Node}
	 */
	parseObject(json) {
		let object;

		switch (json["type"]) {
			case "Node":
			case "Group":
			case "Scene":
				object = new Node();
				break;
			default:
				console.warn(
					`ObjectLoader: unsupported type "${json["type"]}", creating Node`,
				);
				object = new Node();
				break;
		}

		if (json["name"] !== undefined) {
			object.name = /** @type {string} */ (json["name"]);
		}
		if (json["visible"] !== undefined) {
			object.visible = /** @type {boolean} */ (json["visible"]);
		}
		if (json["userData"] !== undefined) object.userData = json["userData"];

		if (json["position"]) {
			const pos = /** @type {number[]} */ (json["position"]);
			object.position.set(pos[0], pos[1], pos[2]);
		}
		if (json["scale"]) {
			const sc = /** @type {number[]} */ (json["scale"]);
			object.scale.set(sc[0], sc[1], sc[2]);
		}

		if (Array.isArray(json["children"])) {
			for (const childJson of /** @type {Record<string,*>[]} */ (
				json["children"]
			)) {
				object.add(this.parseObject(childJson));
			}
		}

		return object;
	}
}
