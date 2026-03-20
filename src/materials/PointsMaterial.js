import { Color } from "../math/Color.js";
import { Material } from "./Material.js";

/**
 * Material for Points objects. Size is an integer pixel radius.
 */
export class PointsMaterial extends Material {
	/** @override @type {string} */
	type = "PointsMaterial";

	/** @type {Color} */
	color;

	/** @type {number} Integer pixel radius. */
	size = 1;

	/** @type {boolean} Signals the rasterizer to use point rendering. */
	points = true;

	/** @type {import('../textures/Texture.js').Texture|undefined} */
	map = undefined;

	/**
	 * @param {object} [options]
	 * @param {Color|number|string} [options.color=0xffffff]
	 * @param {number} [options.size=1]
	 * @param {import('../textures/Texture.js').Texture|undefined} [options.map=undefined]
	 * @param {number} [options.layer]
	 * @param {number} [options.opacity]
	 */
	constructor(options = {}) {
		super(options);
		this.color =
			options.color instanceof Color
				? options.color
				: new Color(options.color ?? 0xffffff);
		if (options.size !== undefined) this.size = options.size;
		if (options.map !== undefined) this.map = options.map;
	}

	/** @returns {number} Alias for {@link size}, used by the rasterizer. */
	get pointRadius() {
		return this.size;
	}

	/**
	 * @override
	 * @returns {PointsMaterial}
	 */
	clone() {
		return new PointsMaterial().copy(this);
	}

	/**
	 * @override
	 * @param {PointsMaterial} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.color.copy(source.color);
		this.size = source.size;
		this.map = source.map;
		return this;
	}
}
