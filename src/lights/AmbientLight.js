import { Light } from "./Light.js";

/**
 * Flat scene-wide brightness added uniformly to all vertices.
 */
export class AmbientLight extends Light {
	/**
	 * @override
	 * @type {string}
	 */
	type = "AmbientLight";

	/**
	 * @param {import('../math/Color.js').Color|number|string} [color=0xffffff]
	 * @param {number} [intensity=1]
	 */
	constructor(color = 0xffffff, intensity = 1) {
		super(color, intensity);
	}
}
