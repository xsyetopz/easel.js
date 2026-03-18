import { Shading, Side } from "../core/Constants.js";

let _materialId = 0;

/**
 * Base material. All materials share layer, opacity, shading, and side.
 */
export class Material {
	/** @type {number} */
	id = _materialId++;

	/** @type {string} */
	name = "";

	/** @type {string} */
	type = "Material";

	/**
	 * Draw order within a tile. Higher values draw later.
	 * @type {number}
	 */
	layer = 0;

	/**
	 * Discrete translucency. 0 = fully opaque, 8 = nearly transparent.
	 * Nine steps, precomputed. Replaces both float opacity and transparent bool.
	 * @type {number}
	 */
	opacity = 0;

	/**
	 * Shading model: Shading.Flat or Shading.Gouraud.
	 * @type {number}
	 */
	shading = Shading.Flat;

	/**
	 * Face culling: Side.Front, Side.Back, or Side.Double.
	 * @type {number}
	 */
	side = Side.Front;

	/** @type {boolean} */
	visible = true;

	/** @type {boolean} */
	needsUpdate = false;

	/**
	 * @param {object} [options]
	 * @param {number} [options.layer=0]
	 * @param {number} [options.opacity=0]
	 * @param {number} [options.shading]
	 * @param {number} [options.side]
	 */
	constructor(options = {}) {
		if (options.layer !== undefined) this.layer = options.layer;
		if (options.opacity !== undefined) this.opacity = options.opacity;
		if (options.shading !== undefined) this.shading = options.shading;
		if (options.side !== undefined) this.side = options.side;
	}

	/** @returns {Material} */
	clone() {
		return new Material().copy(this);
	}

	/**
	 * @param {Material} source
	 * @returns {this}
	 */
	copy(source) {
		this.name = source.name;
		this.layer = source.layer;
		this.opacity = source.opacity;
		this.shading = source.shading;
		this.side = source.side;
		this.visible = source.visible;
		return this;
	}

	/** @returns {void} */
	dispose() {
		// subclasses may override
	}
}
