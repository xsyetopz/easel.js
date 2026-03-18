import { Node } from "../core/Node.js";

export class Points extends Node {
	/** @override @type {string} */
	type = "Points";

	/** @type {import('../geometry/Geometry.js').Geometry|undefined} */
	geometry;

	/** @type {import('../materials/PointsMaterial.js').PointsMaterial|undefined} */
	material;

	/**
	 * @param {import('../geometry/Geometry.js').Geometry} [geometry]
	 * @param {import('../materials/PointsMaterial.js').PointsMaterial} [material]
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
