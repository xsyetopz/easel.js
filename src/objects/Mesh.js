import { Node } from "../core/Node.js";

/** Triangulated surface with geometry and material. */
export class Mesh extends Node {
	/** @override @type {string} */
	type = "Mesh";

	/** @type {import('../geometry/Geometry.js').Geometry|undefined} */
	geometry;

	/** @type {import('../materials/Material.js').Material|undefined} */
	material;

	/**
	 * @param {import('../geometry/Geometry.js').Geometry} [geometry]
	 * @param {import('../materials/Material.js').Material} [material]
	 */
	constructor(geometry = undefined, material = undefined) {
		super();
		this.geometry = geometry;
		this.material = material;
	}

	/**
	 * @override
	 * @returns {Mesh}
	 */
	clone() {
		return new Mesh(this.geometry, this.material).copy(this);
	}

	/**
	 * @override
	 * @param {Mesh} source
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
