import { Vector3 } from "../../math/Vector3.js";
import { Curve } from "../Curve.js";

/** 3D straight line segment between two points. */
export class LineCurve3 extends Curve {
	/** @override */
	type = "LineCurve3";
	#v1;
	#v2;

	/**
	 * @param {Vector3} [v1]
	 * @param {Vector3} [v2]
	 */
	constructor(v1 = new Vector3(), v2 = new Vector3()) {
		super();
		this.#v1 = v1.clone();
		this.#v2 = v2.clone();
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
	 * Returns the point on the line at parameter t.
	 * @override
	 * @param {number} t Parameter in [0, 1]
	 * @param {Vector3} [target=new Vector3()]
	 * @returns {Vector3}
	 */
	getPoint(t, target = new Vector3()) {
		if (t === 1) return target.copy(this.#v2);
		target.copy(this.#v2).sub(this.#v1).mulScalar(t).add(this.#v1);
		return target;
	}

	/**
	 * Returns the unit tangent vector (constant along a line).
	 * @override
	 * @param {number} _t Parameter in [0, 1]
	 * @param {Vector3} [target=new Vector3()]
	 * @returns {Vector3}
	 */
	getTangent(_t, target = new Vector3()) {
		return target.copy(this.#v2).sub(this.#v1).normalize();
	}

	/**
	 * @override
	 * @returns {LineCurve3}
	 */
	clone() {
		return new LineCurve3(this.#v1, this.#v2);
	}

	/**
	 * @override
	 * @param {LineCurve3} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.#v1.copy(source.v1);
		this.#v2.copy(source.v2);
		return this;
	}
}
