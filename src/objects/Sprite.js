import { Node } from "../core/Node.js";

export class Sprite extends Node {
	/** @override @type {string} */
	type = "Sprite";

	/** @type {import('../materials/Material.js').Material|undefined} */
	material;

	/**
	 * @param {import('../materials/Material.js').Material} [material]
	 */
	constructor(material = undefined) {
		super();
		this.material = material;
	}

	/**
	 * @override
	 * @returns {Sprite}
	 */
	clone() {
		return new Sprite(this.material).copy(this);
	}

	/**
	 * @override
	 * @param {Sprite} source
	 * @param {boolean} [recursive=true]
	 * @returns {this}
	 */
	copy(source, recursive = true) {
		super.copy(source, recursive);
		this.material = source.material;
		return this;
	}
}
