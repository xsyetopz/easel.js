import { Vector2 } from "../../math/Vector2.ts";
import { Curve } from "../Curve.js";

/**
 * Catmull-Rom basis for one scalar component.
 * @param {number} p0
 * @param {number} p1
 * @param {number} p2
 * @param {number} p3
 * @param {number} t
 * @returns {number}
 */
function catmullRom(p0, p1, p2, p3, t) {
	const t2 = t * t;
	const t3 = t2 * t;
	return (
		0.5 *
		(2 * p1 +
			(-p0 + p2) * t +
			(2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
			(-p0 + 3 * p1 - 3 * p2 + p3) * t3)
	);
}

/** 2D Catmull-Rom spline through a set of points. */
export class SplineCurve extends Curve {
	/** @override */
	type = "SplineCurve";
	#points;

	/**
	 * @param {Vector2[]} [points=[]]
	 */
	constructor(points = []) {
		super();
		this.#points = points;
	}

	/** @returns {Vector2[]} */
	get points() {
		return this.#points;
	}

	/**
	 * Returns the point on the spline at parameter t.
	 * @override
	 * @param {number} t Parameter in [0, 1]
	 * @param {Vector2} [target=new Vector2()]
	 * @returns {Vector2}
	 */
	getPoint(t, target = new Vector2()) {
		const points = this.#points;
		const l = points.length;
		const p = (l - 1) * t;
		const intPoint = Math.floor(p);
		const weight = p - intPoint;

		const p0 = points[Math.max(0, intPoint - 1)];
		const p1 = points[intPoint];
		const p2 = points[Math.min(intPoint + 1, l - 1)];
		const p3 = points[Math.min(intPoint + 2, l - 1)];

		const x = catmullRom(p0.x, p1.x, p2.x, p3.x, weight);
		const y = catmullRom(p0.y, p1.y, p2.y, p3.y, weight);
		return target.set(x, y);
	}

	/**
	 * @override
	 * @returns {SplineCurve}
	 */
	clone() {
		return new SplineCurve(this.#points.map((p) => p.clone()));
	}

	/**
	 * @override
	 * @param {SplineCurve} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.#points = source.points.map((p) => p.clone());
		return this;
	}
}
