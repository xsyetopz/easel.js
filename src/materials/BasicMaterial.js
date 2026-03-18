import { Shading } from "../core/Constants.js";
import { Color } from "../math/Color.js";
import { Material } from "./Material.js";

/**
 * Solid color or textured, no lighting. Defaults to flat shading.
 */
export class BasicMaterial extends Material {
	/** @override @type {string} */
	type = "BasicMaterial";

	/** @type {Color} */
	color;

	/** @type {import('../textures/Texture.js').Texture|null} */
	map = null;

	/**
	 * @param {object} [options]
	 * @param {Color|number|string} [options.color=0xffffff]
	 * @param {import('../textures/Texture.js').Texture|null} [options.map=null]
	 * @param {number} [options.layer]
	 * @param {number} [options.opacity]
	 * @param {number} [options.shading]
	 * @param {number} [options.side]
	 */
	constructor(options = {}) {
		super(options);
		this.shading = options.shading ?? Shading.Flat;
		this.color =
			options.color instanceof Color
				? options.color
				: new Color(options.color ?? 0xffffff);
		if (options.map !== undefined) this.map = options.map;
	}

	/**
	 * @override
	 * @returns {BasicMaterial}
	 */
	clone() {
		return new BasicMaterial().copy(this);
	}

	/**
	 * @override
	 * @param {BasicMaterial} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.color.copy(source.color);
		this.map = source.map;
		return this;
	}
}
