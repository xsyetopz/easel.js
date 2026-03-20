import { Node } from "../core/Node.js";
import { Color } from "../math/Color.js";

/** Abstract base class for scene lights. */
export class Light extends Node {
	/**
	 * @override
	 * @type {string}
	 */
	type = "Light";

	/** @type {Color} */
	color;

	/** @type {number} */
	intensity;

	/**
	 * @param {Color|number|string} [color=0xffffff]
	 * @param {number} [intensity=1]
	 */
	constructor(color = 0xffffff, intensity = 1) {
		super();
		this.color = color instanceof Color ? color : new Color(color);
		this.intensity = intensity;
	}

	/**
	 * @override
	 * @returns {Light}
	 */
	clone() {
		return new Light().copy(this);
	}

	/**
	 * @override
	 * @param {Light} source
	 * @param {boolean} [recursive=true]
	 * @returns {this}
	 */
	copy(source, recursive = true) {
		super.copy(source, recursive);
		this.color.copy(source.color);
		this.intensity = source.intensity;
		return this;
	}
}
