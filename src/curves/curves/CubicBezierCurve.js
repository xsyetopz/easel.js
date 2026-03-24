import { Vector2 } from "../../math/Vector2.ts";
import { Curve } from "../Curve.js";

/** 2D cubic Bézier curve with four control points. */
export class CubicBezierCurve extends Curve {
	/** @override */
	type = "CubicBezierCurve";
	#v0;
	#v1;
	#v2;
	#v3;

	/**
	 * @param {Vector2} [v0] Start point
	 * @param {Vector2} [v1] First control point
	 * @param {Vector2} [v2] Second control point
	 * @param {Vector2} [v3] End point
	 */
	constructor(
		v0 = new Vector2(),
		v1 = new Vector2(),
		v2 = new Vector2(),
		v3 = new Vector2(),
	) {
		super();
		this.#v0 = v0.clone();
		this.#v1 = v1.clone();
		this.#v2 = v2.clone();
		this.#v3 = v3.clone();
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

	/** @returns {Vector2} */
	get v3() {
		return this.#v3;
	}

	/**
	 * Returns B(t) = (1-t)^3*v0 + 3*(1-t)^2*t*v1 + 3*(1-t)*t^2*v2 + t^3*v3.
	 * @override
	 * @param {number} t Parameter in [0, 1]
	 * @param {Vector2} [target=new Vector2()]
	 * @returns {Vector2}
	 */
	getPoint(t, target = new Vector2()) {
		const mt = 1 - t;
		const mt2 = mt * mt;
		const t2 = t * t;
		const x =
			mt2 * mt * this.#v0.x +
			3 * mt2 * t * this.#v1.x +
			3 * mt * t2 * this.#v2.x +
			t2 * t * this.#v3.x;
		const y =
			mt2 * mt * this.#v0.y +
			3 * mt2 * t * this.#v1.y +
			3 * mt * t2 * this.#v2.y +
			t2 * t * this.#v3.y;
		return target.set(x, y);
	}

	/**
	 * @override
	 * @returns {CubicBezierCurve}
	 */
	clone() {
		return new CubicBezierCurve(this.#v0, this.#v1, this.#v2, this.#v3);
	}

	/**
	 * @override
	 * @param {CubicBezierCurve} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.#v0.copy(source.v0);
		this.#v1.copy(source.v1);
		this.#v2.copy(source.v2);
		this.#v3.copy(source.v3);
		return this;
	}
}
