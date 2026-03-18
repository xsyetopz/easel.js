import { Node } from "./Node.js";

export class Scene extends Node {
	/**
	 * @override
	 * @type {string}
	 */
	type = "Scene";

	/**
	 * Scene-level fog. Set to a Fog instance or null.
	 * @type {import('../scenes/Fog.js').Fog|null}
	 */
	fog = null;

	/**
	 * @override
	 * @returns {Scene}
	 */
	clone() {
		return new Scene().copy(this);
	}
}
