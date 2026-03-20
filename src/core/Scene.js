import { Node } from "./Node.js";

/** Root node of a scene graph, holds background and fog. */
export class Scene extends Node {
	/**
	 * @override
	 * @type {string}
	 */
	type = "Scene";

	/**
	 * When true, the renderer calls updateMatrixWorld() on the scene
	 * before traversal — matching THREE.js behaviour.
	 * @type {boolean}
	 */
	autoUpdate = true;

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
