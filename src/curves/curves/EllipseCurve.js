import { Vector2 } from "../../math/Vector2.js";
import { Curve } from "../Curve.js";

/** 2D ellipse or partial ellipse curve. */
export class EllipseCurve extends Curve {
	/** @override */
	type = "EllipseCurve";
	#cx;
	#cy;
	#xRadius;
	#yRadius;
	#startAngle;
	#endAngle;
	#clockwise;
	#rotation;

	/**
	 * @param {number} [cx=0] Center x
	 * @param {number} [cy=0] Center y
	 * @param {number} [xRadius=1] X radius
	 * @param {number} [yRadius=1] Y radius
	 * @param {number} [startAngle=0] Start angle in radians
	 * @param {number} [endAngle=Math.PI*2] End angle in radians
	 * @param {boolean} [clockwise=false]
	 * @param {number} [rotation=0] Rotation of the ellipse in radians
	 */
	constructor(
		cx = 0,
		cy = 0,
		xRadius = 1,
		yRadius = 1,
		startAngle = 0,
		endAngle = Math.PI * 2,
		clockwise = false,
		rotation = 0,
	) {
		super();
		this.#cx = cx;
		this.#cy = cy;
		this.#xRadius = xRadius;
		this.#yRadius = yRadius;
		this.#startAngle = startAngle;
		this.#endAngle = endAngle;
		this.#clockwise = clockwise;
		this.#rotation = rotation;
	}

	/** @returns {number} */ get cx() {
		return this.#cx;
	}
	/** @returns {number} */ get cy() {
		return this.#cy;
	}
	/** @returns {number} */ get xRadius() {
		return this.#xRadius;
	}
	/** @returns {number} */ get yRadius() {
		return this.#yRadius;
	}
	/** @returns {number} */ get startAngle() {
		return this.#startAngle;
	}
	/** @returns {number} */ get endAngle() {
		return this.#endAngle;
	}
	/** @returns {boolean} */ get clockwise() {
		return this.#clockwise;
	}
	/** @returns {number} */ get rotation() {
		return this.#rotation;
	}

	/**
	 * Returns the point on the ellipse at parameter t.
	 * @override
	 * @param {number} t Parameter in [0, 1]
	 * @param {Vector2} [target=new Vector2()]
	 * @returns {Vector2}
	 */
	getPoint(t, target = new Vector2()) {
		let angle = this.#startAngle + t * (this.#endAngle - this.#startAngle);
		if (this.#clockwise) {
			angle = this.#endAngle - t * (this.#endAngle - this.#startAngle);
		}

		const cos = Math.cos;
		const sin = Math.sin;
		const cosA = cos(angle);
		const sinA = sin(angle);
		const cosR = cos(this.#rotation);
		const sinR = sin(this.#rotation);

		const x =
			this.#cx + this.#xRadius * cosA * cosR - this.#yRadius * sinA * sinR;
		const y =
			this.#cy + this.#xRadius * cosA * sinR + this.#yRadius * sinA * cosR;

		return target.set(x, y);
	}

	/**
	 * @override
	 * @returns {EllipseCurve}
	 */
	clone() {
		return new EllipseCurve(
			this.#cx,
			this.#cy,
			this.#xRadius,
			this.#yRadius,
			this.#startAngle,
			this.#endAngle,
			this.#clockwise,
			this.#rotation,
		);
	}

	/**
	 * @override
	 * @param {EllipseCurve} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.#cx = source.cx;
		this.#cy = source.cy;
		this.#xRadius = source.xRadius;
		this.#yRadius = source.yRadius;
		this.#startAngle = source.startAngle;
		this.#endAngle = source.endAngle;
		this.#clockwise = source.clockwise;
		this.#rotation = source.rotation;
		return this;
	}
}
