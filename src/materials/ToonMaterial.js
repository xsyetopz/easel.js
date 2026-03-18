import { Shading } from "../core/Constants.js";
import { Color } from "../math/Color.js";
import { Material } from "./Material.js";

/**
 * Stepped shading via gradientMap. Each lighting level snaps to
 * the nearest HSL16 step.
 */
export class ToonMaterial extends Material {
	/** @override @type {string} */
	type = "ToonMaterial";

	/** @type {Color} */
	color;

	/** @type {import('../textures/Texture.js').Texture|undefined} */
	gradientMap = undefined;

	/**
	 * @param {object} [options]
	 * @param {Color|number|string} [options.color=0xffffff]
	 * @param {import('../textures/Texture.js').Texture|undefined} [options.gradientMap=undefined]
	 * @param {number} [options.layer]
	 * @param {number} [options.opacity]
	 * @param {number} [options.side]
	 */
	constructor(options = {}) {
		super(options);
		this.shading = Shading.Gouraud;
		this.color =
			options.color instanceof Color
				? options.color
				: new Color(options.color ?? 0xffffff);
		if (options.gradientMap !== undefined) {
			this.gradientMap = options.gradientMap;
		}
	}

	/**
	 * @override
	 * @returns {ToonMaterial}
	 */
	clone() {
		return new ToonMaterial().copy(this);
	}

	/**
	 * @override
	 * @param {ToonMaterial} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.color.copy(source.color);
		this.gradientMap = source.gradientMap;
		return this;
	}
}
