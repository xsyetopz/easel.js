import { LightType } from "../core/Constants.js";
import { Vector3 } from "../math/Vector3.ts";
import { Light } from "./Light.js";

/** @typedef {import("../core/Node.js").Node} Node */

/**
 * Per-vertex cone attenuation, CPU-computed.
 * When target is set, direction is computed as normalize(target world pos - light world pos).
 */
export class SpotLight extends Light {
	/**
	 * @override
	 * @type {string}
	 */
	type = "SpotLight";

	/** @type {number} */
	lightType = LightType.Spot;

	/** Local-space cone direction. @type {Vector3} */
	direction = new Vector3(0, -1, 0);

	/**
	 * Optional target node. When set, overrides direction.
	 * Direction becomes normalize(target.matrixWorld position - this.matrixWorld position).
	 * @type {Node|undefined}
	 */
	target = undefined;

	/** @type {number} */
	distance;

	/** @type {number} */
	#angle = Math.PI / 3;

	/** @type {number} */
	#penumbra = 0;

	/**
	 * Precomputed `Math.cos(angle)`. Updated whenever `angle` or `penumbra` change.
	 * @type {number}
	 */
	_cosAngle = Math.cos(Math.PI / 3);

	/**
	 * Precomputed `Math.cos(angle * (1 - penumbra))`. Updated whenever `angle` or `penumbra` change.
	 * @type {number}
	 */
	_cosInnerAngle = Math.cos(Math.PI / 3);

	/** @type {number} */
	decay;

	/** @returns {number} */
	get angle() {
		return this.#angle;
	}

	/** @param {number} value */
	set angle(value) {
		this.#angle = value;
		this.#updateTrig();
	}

	/** @returns {number} */
	get penumbra() {
		return this.#penumbra;
	}

	/** @param {number} value */
	set penumbra(value) {
		this.#penumbra = value;
		this.#updateTrig();
	}

	/** @returns {void} */
	#updateTrig() {
		this._cosAngle = Math.cos(this.#angle);
		this._cosInnerAngle = Math.cos(this.#angle * (1 - this.#penumbra));
	}

	/**
	 * @param {*|number|string} [color=0xffffff]
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
		// Use setters to initialize cached trig values.
		this.#angle = angle;
		this.#penumbra = penumbra;
		this.#updateTrig();
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
		this.direction.copy(source.direction);
		this.target = source.target;
		this.distance = source.distance;
		this.angle = source.angle;
		this.penumbra = source.penumbra;
		this.decay = source.decay;
		return this;
	}
}
