import { Color } from "../math/Color.js";
import { LineMaterial } from "./LineMaterial.js";

export class DashedLineMaterial extends LineMaterial {
	/** @override @type {string} */
	type = "DashedLineMaterial";

	/** @type {number} */
	dashSize = 3;

	/** @type {number} */
	gapSize = 1;

	/**
	 * @param {object} [options]
	 * @param {Color|number|string} [options.color=0xffffff]
	 * @param {number} [options.linewidth=1]
	 * @param {number} [options.dashSize=3]
	 * @param {number} [options.gapSize=1]
	 * @param {number} [options.layer]
	 * @param {number} [options.opacity]
	 */
	constructor(options = {}) {
		super(options);
		if (options.dashSize !== undefined) this.dashSize = options.dashSize;
		if (options.gapSize !== undefined) this.gapSize = options.gapSize;
	}

	/**
	 * @override
	 * @returns {DashedLineMaterial}
	 */
	clone() {
		return new DashedLineMaterial().copy(this);
	}

	/**
	 * @override
	 * @param {DashedLineMaterial} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.dashSize = source.dashSize;
		this.gapSize = source.gapSize;
		return this;
	}
}
