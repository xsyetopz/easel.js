import { Color } from "../math/Color.ts";
import { Material } from "./Material.js";

/**
 * For Line, LineSegments, LineLoop. Rendered via Bresenham integer line.
 */
export class LineMaterial extends Material {
	/** @override @type {string} */
	type = "LineMaterial";

	/** @type {Color} */
	color;

	/** @type {number} */
	linewidth = 1;

	/**
	 * @param {object} [options]
	 * @param {Color|number|string} [options.color=0xffffff]
	 * @param {number} [options.linewidth=1]
	 * @param {number} [options.layer]
	 * @param {number} [options.opacity]
	 */
	constructor(options = {}) {
		super(options);
		this.color =
			options.color instanceof Color
				? options.color
				: new Color(options.color ?? 0xffffff);
		if (options.linewidth !== undefined) this.linewidth = options.linewidth;
	}

	/**
	 * @override
	 * @returns {LineMaterial}
	 */
	clone() {
		return new LineMaterial().copy(this);
	}

	/**
	 * @override
	 * @param {LineMaterial} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.color.copy(source.color);
		this.linewidth = source.linewidth;
		return this;
	}
}
