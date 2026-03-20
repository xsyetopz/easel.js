import { Node } from "../core/Node.js";

/** Camera-facing quad rendered from a texture. */
export class Sprite extends Node {
	/** @override @type {string} */
	type = "Sprite";

	/** @type {*|undefined} */
	material;

	/**
	 * @param {*} [material]
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
