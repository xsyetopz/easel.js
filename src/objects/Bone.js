import { Node } from "../core/Node.js";

/** Skeletal bone node used by SkinnedMesh. */
export class Bone extends Node {
	/** @override @type {string} */
	type = "Bone";

	/**
	 * @override
	 * @returns {Bone}
	 */
	clone() {
		return new Bone().copy(this);
	}
}
