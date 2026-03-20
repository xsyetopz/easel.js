import { LightType } from "../core/Constants.js";
import { Color } from "../math/Color.js";
import { Light } from "./Light.js";

/**
 * Per-vertex sky/ground blend evaluated against world Y axis normal.
 */
export class HemisphereLight extends Light {
	/**
	 * @override
	 * @type {string}
	 */
	type = "HemisphereLight";

	/** @type {number} */
	lightType = LightType.Hemisphere;

	/** @type {Color} */
	groundColor;

	/**
	 * @param {Color|number|string} [skyColor=0xffffff]
	 * @param {Color|number|string} [groundColor=0xffffff]
	 * @param {number} [intensity=1]
	 */
	constructor(skyColor = 0xffffff, groundColor = 0xffffff, intensity = 1) {
		super(skyColor, intensity);
		this.groundColor =
			groundColor instanceof Color ? groundColor : new Color(groundColor);
		this.position.set(0, 1, 0);
	}

	/**
	 * @override
	 * @param {HemisphereLight} source
	 * @param {boolean} [recursive=true]
	 * @returns {this}
	 */
	copy(source, recursive = true) {
		super.copy(source, recursive);
		this.groundColor.copy(source.groundColor);
		return this;
	}
}
