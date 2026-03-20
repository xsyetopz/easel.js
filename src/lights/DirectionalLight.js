import { LightType } from "../core/Constants.js";
import { Light } from "./Light.js";

/** @typedef {import("../core/Node.js").Node} Node */

/**
 * Per-face or per-vertex depending on material shading mode.
 * Position determines direction when target is undefined.
 * When target is set, direction is computed as normalize(target world pos - light world pos).
 * No shadow support.
 */
export class DirectionalLight extends Light {
	/**
	 * @override
	 * @type {string}
	 */
	type = "DirectionalLight";

	/** @type {number} */
	lightType = LightType.Directional;

	/**
	 * Optional target node. When set, overrides position-based direction.
	 * Direction becomes normalize(target.matrixWorld position - this.matrixWorld position).
	 * @type {Node|undefined}
	 */
	target = undefined;

	/**
	 * @param {*|number|string} [color=0xffffff]
	 * @param {number} [intensity=1]
	 */
	constructor(color = 0xffffff, intensity = 1) {
		super(color, intensity);
		this.position.set(0, 1, 0);
	}
}
