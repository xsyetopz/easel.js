import { Light } from "./Light.js";

/**
 * Per-vertex distance attenuation, CPU-computed.
 */
export class PointLight extends Light {
	/**
	 * @override
	 * @type {string}
	 */
	type = "PointLight";

	/** @type {number} */
	distance;

	/** @type {number} */
	decay;

	/**
	 * @param {import('../math/Color.js').Color|number|string} [color=0xffffff]
	 * @param {number} [intensity=1]
	 * @param {number} [distance=0] 0 means no limit.
	 * @param {number} [decay=2]
	 */
	constructor(color = 0xffffff, intensity = 1, distance = 0, decay = 2) {
		super(color, intensity);
		this.distance = distance;
		this.decay = decay;
	}

	/**
	 * @override
	 * @param {PointLight} source
	 * @param {boolean} [recursive=true]
	 * @returns {this}
	 */
	copy(source, recursive = true) {
		super.copy(source, recursive);
		this.distance = source.distance;
		this.decay = source.decay;
		return this;
	}
}
