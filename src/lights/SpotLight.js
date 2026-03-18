import { Light } from "./Light.js";

/**
 * Per-vertex cone attenuation, CPU-computed.
 */
export class SpotLight extends Light {
	/**
	 * @override
	 * @type {string}
	 */
	type = "SpotLight";

	/** @type {number} */
	distance;

	/** @type {number} */
	angle;

	/** @type {number} */
	penumbra;

	/** @type {number} */
	decay;

	/**
	 * @param {import('../math/Color.js').Color|number|string} [color=0xffffff]
	 * @param {number} [intensity=1]
	 * @param {number} [distance=0]
	 * @param {number} [angle=Math.PI/3]
	 * @param {number} [penumbra=0]
	 * @param {number} [decay=2]
	 */
	constructor(
		color = 0xffffff,
		intensity = 1,
		distance = 0,
		angle = Math.PI / 3,
		penumbra = 0,
		decay = 2,
	) {
		super(color, intensity);
		this.distance = distance;
		this.angle = angle;
		this.penumbra = penumbra;
		this.decay = decay;
	}

	/**
	 * @override
	 * @param {SpotLight} source
	 * @param {boolean} [recursive=true]
	 * @returns {this}
	 */
	copy(source, recursive = true) {
		super.copy(source, recursive);
		this.distance = source.distance;
		this.angle = source.angle;
		this.penumbra = source.penumbra;
		this.decay = source.decay;
		return this;
	}
}
