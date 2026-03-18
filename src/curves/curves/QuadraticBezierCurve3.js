import { Vector3 } from "../../math/Vector3.js";
import { Curve } from "../Curve.js";

export class QuadraticBezierCurve3 extends Curve {
	/** @override */
	type = "QuadraticBezierCurve3";
	#v0;
	#v1;
	#v2;

	/**
	 * @param {Vector3} [v0] Start point
	 * @param {Vector3} [v1] Control point
	 * @param {Vector3} [v2] End point
	 */
	constructor(v0 = new Vector3(), v1 = new Vector3(), v2 = new Vector3()) {
		super();
		this.#v0 = v0.clone();
		this.#v1 = v1.clone();
		this.#v2 = v2.clone();
	}

	/** @returns {Vector3} */
	get v0() {
		return this.#v0;
	}

	/** @returns {Vector3} */
	get v1() {
		return this.#v1;
	}

	/** @returns {Vector3} */
	get v2() {
		return this.#v2;
	}

	/**
	 * Returns B(t) = (1-t)^2*v0 + 2*(1-t)*t*v1 + t^2*v2.
	 * @override
	 * @param {number} t Parameter in [0, 1]
	 * @param {Vector3} [target=new Vector3()]
	 * @returns {Vector3}
	 */
	getPoint(t, target = new Vector3()) {
		const mt = 1 - t;
		const x =
			mt * mt * this.#v0.x + 2 * mt * t * this.#v1.x + t * t * this.#v2.x;
		const y =
			mt * mt * this.#v0.y + 2 * mt * t * this.#v1.y + t * t * this.#v2.y;
		const z =
			mt * mt * this.#v0.z + 2 * mt * t * this.#v1.z + t * t * this.#v2.z;
		return target.set(x, y, z);
	}

	/**
	 * @override
	 * @returns {QuadraticBezierCurve3}
	 */
	clone() {
		return new QuadraticBezierCurve3(this.#v0, this.#v1, this.#v2);
	}

	/**
	 * @override
	 * @param {QuadraticBezierCurve3} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.#v0.copy(source.v0);
		this.#v1.copy(source.v1);
		this.#v2.copy(source.v2);
		return this;
	}
}
