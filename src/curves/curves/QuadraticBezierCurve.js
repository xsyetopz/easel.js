import { Vector2 } from "../../math/Vector2.js";
import { Curve } from "../Curve.js";

/** 2D quadratic Bézier curve with three control points. */
export class QuadraticBezierCurve extends Curve {
	/** @override */
	type = "QuadraticBezierCurve";
	#v0;
	#v1;
	#v2;

	/**
	 * @param {Vector2} [v0] Start point
	 * @param {Vector2} [v1] Control point
	 * @param {Vector2} [v2] End point
	 */
	constructor(v0 = new Vector2(), v1 = new Vector2(), v2 = new Vector2()) {
		super();
		this.#v0 = v0.clone();
		this.#v1 = v1.clone();
		this.#v2 = v2.clone();
	}

	/** @returns {Vector2} */
	get v0() {
		return this.#v0;
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
	 * Returns B(t) = (1-t)^2*v0 + 2*(1-t)*t*v1 + t^2*v2.
	 * @override
	 * @param {number} t Parameter in [0, 1]
	 * @param {Vector2} [target=new Vector2()]
	 * @returns {Vector2}
	 */
	getPoint(t, target = new Vector2()) {
		const mt = 1 - t;
		const x =
			mt * mt * this.#v0.x + 2 * mt * t * this.#v1.x + t * t * this.#v2.x;
		const y =
			mt * mt * this.#v0.y + 2 * mt * t * this.#v1.y + t * t * this.#v2.y;
		return target.set(x, y);
	}

	/**
	 * @override
	 * @returns {QuadraticBezierCurve}
	 */
	clone() {
		return new QuadraticBezierCurve(this.#v0, this.#v1, this.#v2);
	}

	/**
	 * @override
	 * @param {QuadraticBezierCurve} source
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
