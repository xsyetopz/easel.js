import { Vector2 } from "../math/Vector2.js";
import { CurvePath } from "./CurvePath.js";
import { CubicBezierCurve } from "./curves/CubicBezierCurve.js";
import { EllipseCurve } from "./curves/EllipseCurve.js";
import { LineCurve } from "./curves/LineCurve.js";
import { QuadraticBezierCurve } from "./curves/QuadraticBezierCurve.js";

/** 2D path built from lines, arcs, and bezier segments. */
export class Path extends CurvePath {
	/** @override */
	type = "Path";
	#currentPoint = new Vector2();

	/**
	 * @param {Vector2[]} [points]
	 */
	constructor(points) {
		super();
		if (points) this.setFromPoints(points);
	}

	/** @returns {Vector2} */
	get currentPoint() {
		return this.#currentPoint;
	}

	/**
	 * Creates LineCurves connecting the given points and sets currentPoint to the last.
	 * @param {Vector2[]} points
	 * @returns {this}
	 */
	setFromPoints(points) {
		this.moveTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i++) {
			this.lineTo(points[i].x, points[i].y);
		}
		return this;
	}

	/**
	 * Moves currentPoint without adding a curve.
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	moveTo(x, y) {
		this.#currentPoint.set(x, y);
		return this;
	}

	/**
	 * Adds a LineCurve from currentPoint to (x, y).
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	lineTo(x, y) {
		this.add(new LineCurve(this.#currentPoint.clone(), new Vector2(x, y)));
		this.#currentPoint.set(x, y);
		return this;
	}

	/**
	 * Adds a QuadraticBezierCurve from currentPoint through (cpX, cpY) to (x, y).
	 * @param {number} cpX
	 * @param {number} cpY
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	quadraticCurveTo(cpX, cpY, x, y) {
		this.add(
			new QuadraticBezierCurve(
				this.#currentPoint.clone(),
				new Vector2(cpX, cpY),
				new Vector2(x, y),
			),
		);
		this.#currentPoint.set(x, y);
		return this;
	}

	/**
	 * Adds a CubicBezierCurve from currentPoint through two control points to (x, y).
	 * @param {number} cp1X
	 * @param {number} cp1Y
	 * @param {number} cp2X
	 * @param {number} cp2Y
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, x, y) {
		this.add(
			new CubicBezierCurve(
				this.#currentPoint.clone(),
				new Vector2(cp1X, cp1Y),
				new Vector2(cp2X, cp2Y),
				new Vector2(x, y),
			),
		);
		this.#currentPoint.set(x, y);
		return this;
	}

	/**
	 * Adds an EllipseCurve at currentPoint + (x, y) offset.
	 * @param {number} x Center offset x
	 * @param {number} y Center offset y
	 * @param {number} radius
	 * @param {number} startAngle
	 * @param {number} endAngle
	 * @param {boolean} clockwise
	 * @returns {this}
	 */
	arc(x, y, radius, startAngle, endAngle, clockwise) {
		const cx = this.#currentPoint.x + x;
		const cy = this.#currentPoint.y + y;
		return this.absarc(cx, cy, radius, startAngle, endAngle, clockwise);
	}

	/**
	 * Adds an EllipseCurve at absolute center (x, y).
	 * @param {number} x
	 * @param {number} y
	 * @param {number} radius
	 * @param {number} startAngle
	 * @param {number} endAngle
	 * @param {boolean} clockwise
	 * @returns {this}
	 */
	absarc(x, y, radius, startAngle, endAngle, clockwise) {
		return this.absellipse(
			x,
			y,
			radius,
			radius,
			startAngle,
			endAngle,
			clockwise,
			0,
		);
	}

	/**
	 * Adds an EllipseCurve at currentPoint + (x, y) offset.
	 * @param {number} x Center offset x
	 * @param {number} y Center offset y
	 * @param {number} xR X radius
	 * @param {number} yR Y radius
	 * @param {number} startAngle
	 * @param {number} endAngle
	 * @param {boolean} clockwise
	 * @param {number} rotation
	 * @returns {this}
	 */
	ellipse(x, y, xR, yR, startAngle, endAngle, clockwise, rotation) {
		const cx = this.#currentPoint.x + x;
		const cy = this.#currentPoint.y + y;
		return this.absellipse(
			cx,
			cy,
			xR,
			yR,
			startAngle,
			endAngle,
			clockwise,
			rotation,
		);
	}

	/**
	 * Adds an EllipseCurve at absolute center (x, y).
	 * @param {number} x
	 * @param {number} y
	 * @param {number} xR X radius
	 * @param {number} yR Y radius
	 * @param {number} startAngle
	 * @param {number} endAngle
	 * @param {boolean} clockwise
	 * @param {number} rotation
	 * @returns {this}
	 */
	absellipse(x, y, xR, yR, startAngle, endAngle, clockwise, rotation) {
		const curve = new EllipseCurve(
			x,
			y,
			xR,
			yR,
			startAngle,
			endAngle,
			clockwise,
			rotation,
		);
		if (this.curves.length > 0) {
			const firstPoint = curve.getPoint(0, undefined);
			if (!firstPoint.equals(this.#currentPoint)) {
				this.lineTo(firstPoint.x, firstPoint.y);
			}
		}
		this.add(curve);
		const lastPoint = curve.getPoint(1, undefined);
		this.#currentPoint.copy(lastPoint);
		return this;
	}

	/**
	 * @override
	 * @returns {Path}
	 */
	clone() {
		/** @type {new () => Path} */
		const Ctor = /** @type {any} */ (this.constructor);
		return new Ctor().copy(this);
	}

	/**
	 * @override
	 * @param {Path} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.#currentPoint.copy(source.currentPoint);
		return this;
	}
}
