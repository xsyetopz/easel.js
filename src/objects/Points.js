import { Node } from "../core/Node.js";

/** Point cloud rendered as individual vertices. */
export class Points extends Node {
	/** @override @type {string} */
	type = "Points";

	/** @type {*|undefined} */
	geometry;

	/** @type {*|undefined} */
	material;

	/**
	 * @param {*} [geometry]
	 * @param {*} [material]
	 */
	constructor(geometry = undefined, material = undefined) {
		super();
		this.geometry = geometry;
		this.material = material;
	}

	/**
	 * @override
	 * @returns {Points}
	 */
	clone() {
		return new Points(this.geometry, this.material).copy(this);
	}

	/**
	 * @override
	 * @param {Points} source
	 * @param {boolean} [recursive=true]
	 * @returns {this}
	 */
	copy(source, recursive = true) {
		super.copy(source, recursive);
		this.geometry = source.geometry;
		this.material = source.material;
		return this;
	}
}
