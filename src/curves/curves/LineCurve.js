import { Vector2 } from "../../math/Vector2.js";
import { Curve } from "../Curve.js";

export class LineCurve extends Curve {
	/** @override */
	type = "LineCurve";
	#v1;
	#v2;

	/**
	 * @param {Vector2} [v1]
	 * @param {Vector2} [v2]
	 */
	constructor(v1 = new Vector2(), v2 = new Vector2()) {
		super();
		this.#v1 = v1.clone();
		this.#v2 = v2.clone();
	}

	/** @returns {Vector2} */
	get v1() {
		return this.#v1;
	}

	/** @returns {Vector2} */
	get v2() {
		return this.#v2;
	}

	/**
	 * Returns the point on the line at parameter t.
	 * @override
	 * @param {number} t Parameter in [0, 1]
	 * @param {Vector2} [target=new Vector2()]
	 * @returns {Vector2}
	 */
	getPoint(t, target = new Vector2()) {
		if (t === 1) return target.copy(this.#v2);
		target.copy(this.#v2).sub(this.#v1).mulScalar(t).add(this.#v1);
		return target;
	}

	/**
	 * Returns the unit tangent vector (constant along a line).
	 * @override
	 * @param {number} _t Parameter in [0, 1]
	 * @param {Vector2} [target=new Vector2()]
	 * @returns {Vector2}
	 */
	getTangent(_t, target = new Vector2()) {
		target.copy(this.#v2).sub(this.#v1);
		const len = Math.sqrt(target.x * target.x + target.y * target.y);
		if (len > 0) target.mulScalar(1 / len);
		return target;
	}

	/**
	 * @override
	 * @returns {LineCurve}
	 */
	clone() {
		return new LineCurve(this.#v1, this.#v2);
	}

	/**
	 * @override
	 * @param {LineCurve} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.#v1.copy(source.v1);
		this.#v2.copy(source.v2);
		return this;
	}
}
