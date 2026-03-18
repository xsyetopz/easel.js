import { Shading } from "../core/Constants.js";
import { Color } from "../math/Color.js";
import { Material } from "./Material.js";

/**
 * Diffuse lighting from all lights in scene. Defaults to Gouraud shading —
 * per-vertex lighting interpolated across faces.
 */
export class LambertMaterial extends Material {
	/** @override @type {string} */
	type = "LambertMaterial";

	/** @type {Color} */
	color;

	/** @type {import('../textures/Texture.js').Texture|undefined} */
	map = undefined;

	/**
	 * @param {object} [options]
	 * @param {Color|number|string} [options.color=0xffffff]
	 * @param {import('../textures/Texture.js').Texture|undefined} [options.map=undefined]
	 * @param {number} [options.layer]
	 * @param {number} [options.opacity]
	 * @param {number} [options.shading]
	 * @param {number} [options.side]
	 */
	constructor(options = {}) {
		super(options);
		this.shading = options.shading ?? Shading.Gouraud;
		this.color =
			options.color instanceof Color
				? options.color
				: new Color(options.color ?? 0xffffff);
		if (options.map !== undefined) this.map = options.map;
	}

	/**
	 * @override
	 * @returns {LambertMaterial}
	 */
	clone() {
		return new LambertMaterial().copy(this);
	}

	/**
	 * @override
	 * @param {LambertMaterial} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.color.copy(source.color);
		this.map = source.map;
		return this;
	}
}
