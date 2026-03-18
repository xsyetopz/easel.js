import { Node } from "../core/Node.js";

export class Line extends Node {
	/** @override @type {string} */
	type = "Line";

	/** @type {import('../geometry/Geometry.js').Geometry|undefined} */
	geometry;

	/** @type {import('../materials/LineMaterial.js').LineMaterial|undefined} */
	material;

	/**
	 * @param {import('../geometry/Geometry.js').Geometry} [geometry]
	 * @param {import('../materials/LineMaterial.js').LineMaterial} [material]
	 */
	constructor(geometry = undefined, material = undefined) {
		super();
		this.geometry = geometry;
		this.material = material;
	}

	/**
	 * @override
	 * @returns {Line}
	 */
	clone() {
		return new Line(this.geometry, this.material).copy(this);
	}

	/**
	 * @override
	 * @param {Line} source
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
