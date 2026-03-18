import { Light } from "./Light.js";

/**
 * Per-face or per-vertex depending on material shading mode.
 * Position determines direction. No shadow support.
 */
export class DirectionalLight extends Light {
	/**
	 * @override
	 * @type {string}
	 */
	type = "DirectionalLight";

	/**
	 * @param {import('../math/Color.js').Color|number|string} [color=0xffffff]
	 * @param {number} [intensity=1]
	 */
	constructor(color = 0xffffff, intensity = 1) {
		super(color, intensity);
		this.position.set(0, 1, 0);
	}
}
