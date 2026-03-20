import { Path } from "./Path.js";

/** Closed 2D path with optional holes, used for extrusion. */
export class Shape extends Path {
	/** @override */
	type = "Shape";
	/** @type {import('./Path.js').Path[]} */
	#holes = [];

	/** @returns {Path[]} */
	get holes() {
		return this.#holes;
	}

	/**
	 * Returns an array of point arrays, one per hole.
	 * @param {number} divisions
	 * @returns {Array<*>[]}
	 */
	getPointsHoles(divisions) {
		return this.#holes.map((hole) => hole.getPoints(divisions));
	}

	/**
	 * Returns the shape outline points and hole points.
	 * @param {number} divisions
	 * @returns {{ shape: Array<*>, holes: Array<*>[] }}
	 */
	extractPoints(divisions) {
		return {
			shape: this.getPoints(divisions),
			holes: this.getPointsHoles(divisions),
		};
	}

	/**
	 * @override
	 * @returns {Shape}
	 */
	clone() {
		return new Shape().copy(this);
	}

	/**
	 * @override
	 * @param {Shape} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.#holes = source.holes.map((h) => h.clone());
		return this;
	}
}
