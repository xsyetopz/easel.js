import { Node } from "./Node.js";

/** Root node of a scene graph, holds background and fog. */
export class Scene extends Node {
	/**
	 * @override
	 * @type {string}
	 */
	type = "Scene";

	/**
	 * Scene-level fog. Set to a Fog instance or undefined.
	 * @type {*|undefined}
	 */
	fog = undefined;

	/**
	 * @override
	 * @returns {Scene}
	 */
	clone() {
		return new Scene().copy(this);
	}
}
