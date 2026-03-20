import { Path } from "./Path.js";
import { Shape } from "./Shape.js";

/** Builder for Shape objects from SVG-style subpaths. */
export class ShapePath {
	type = "ShapePath";
	/** @type {Path[]} */
	#subPaths = [];
	/** @type {Path|undefined} */
	#currentPath = undefined;

	/**
	 * Starts a new sub-path at (x, y).
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	moveTo(x, y) {
		this.#currentPath = new Path();
		this.#subPaths.push(this.#currentPath);
		this.#currentPath.moveTo(x, y);
		return this;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	lineTo(x, y) {
		this.#currentPath?.lineTo(x, y);
		return this;
	}

	/**
	 * @param {number} cpX
	 * @param {number} cpY
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	quadraticCurveTo(cpX, cpY, x, y) {
		this.#currentPath?.quadraticCurveTo(cpX, cpY, x, y);
		return this;
	}

	/**
	 * @param {number} cp1X
	 * @param {number} cp1Y
	 * @param {number} cp2X
	 * @param {number} cp2Y
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, x, y) {
		this.#currentPath?.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, x, y);
		return this;
	}

	/**
	 * Converts accumulated sub-paths into Shape objects.
	 * Each sub-path becomes a Shape; isCCW controls winding-order interpretation.
	 * @param {boolean} [_isCCW=false]
	 * @returns {Shape[]}
	 */
	toShapes(_isCCW = false) {
		if (this.#subPaths.length === 0) return [];

		const shapes = [];
		for (const path of this.#subPaths) {
			const shape = new Shape();
			for (const curve of path.curves) shape.add(curve);
			shapes.push(shape);
		}
		return shapes;
	}
}
