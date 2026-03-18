import { Curve } from "./Curve.js";
import { LineCurve } from "./curves/LineCurve.js";

export class CurvePath extends Curve {
	/** @override */
	type = "CurvePath";
	/** @type {Curve[]} */
	#curves = [];
	#autoClose = false;

	/** @returns {Curve[]} */
	get curves() {
		return this.#curves;
	}

	/** @returns {boolean} */
	get autoClose() {
		return this.#autoClose;
	}

	/** @param {boolean} value */
	set autoClose(value) {
		this.#autoClose = value;
	}

	/**
	 * Appends a curve to the path.
	 * @param {Curve} curve
	 * @returns {void}
	 */
	add(curve) {
		this.#curves.push(curve);
	}

	/**
	 * Closes the path by appending a LineCurve from the last point to the first.
	 * @returns {void}
	 */
	closePath() {
		const startPoint = this.#curves[0].getPoint(0);
		const endPoint = this.#curves[this.#curves.length - 1].getPoint(1);
		if (!startPoint.equals(endPoint)) {
			this.#curves.push(new LineCurve(endPoint, startPoint));
		}
	}

	/**
	 * Returns the point on the path at parameter t, mapping across sub-curves.
	 * @override
	 * @param {number} t Parameter in [0, 1]
	 * @param {*} [target]
	 * @returns {*}
	 */
	getPoint(t, target) {
		const d = t * this.getLength();
		const curveLengths = this.getCurveLengths();
		let i = 0;
		while (i < curveLengths.length) {
			if (curveLengths[i] >= d) {
				const diff = curveLengths[i] - d;
				const curve = this.#curves[i];
				const segmentLength = curve.getLength();
				const u = segmentLength === 0 ? 0 : 1 - diff / segmentLength;
				return curve.getPointAt(u, target);
			}
			i++;
		}
		return undefined;
	}

	/**
	 * Returns the total arc length of the path.
	 * @override
	 * @returns {number}
	 */
	getLength() {
		const lengths = this.getCurveLengths();
		return lengths[lengths.length - 1];
	}

	/**
	 * Returns an array of cumulative arc lengths for each sub-curve.
	 * @returns {number[]}
	 */
	getCurveLengths() {
		if (this.#curves.length === 0) return [0];
		const lengths = [];
		let sum = 0;
		for (const curve of this.#curves) {
			sum += curve.getLength();
			lengths.push(sum);
		}
		return lengths;
	}

	/**
	 * Returns an array of (divisions + 1) points evenly spaced by parameter.
	 * @override
	 * @param {number} [divisions=12]
	 * @returns {Array<*>}
	 */
	getPoints(divisions = 12) {
		const points = [];
		for (let d = 0; d <= divisions; d++) {
			points.push(this.getPoint(d / divisions, undefined));
		}
		return points;
	}

	/**
	 * Returns an array of (divisions + 1) points evenly spaced by arc length.
	 * @override
	 * @param {number} [divisions=40]
	 * @returns {Array<*>}
	 */
	getSpacedPoints(divisions = 40) {
		const points = [];
		for (let d = 0; d <= divisions; d++) {
			points.push(this.getPointAt(d / divisions));
		}
		return points;
	}

	/**
	 * Returns a new CurvePath with the same properties.
	 * @override
	 * @returns {CurvePath}
	 */
	clone() {
		/** @type {new () => CurvePath} */
		const Ctor = /** @type {any} */ (this.constructor);
		return new Ctor().copy(this);
	}

	/**
	 * Copies properties from source into this path.
	 * @override
	 * @param {CurvePath} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.#curves = source.curves.map((c) => c.clone());
		this.#autoClose = source.autoClose;
		return this;
	}
}
