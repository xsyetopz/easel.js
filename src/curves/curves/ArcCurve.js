import { EllipseCurve } from "./EllipseCurve.js";

export class ArcCurve extends EllipseCurve {
	/** @override */
	type = "ArcCurve";

	/**
	 * @param {number} [cx=0] Center x
	 * @param {number} [cy=0] Center y
	 * @param {number} [radius=1] Radius
	 * @param {number} [startAngle=0] Start angle in radians
	 * @param {number} [endAngle=Math.PI*2] End angle in radians
	 * @param {boolean} [clockwise=false]
	 */
	constructor(
		cx = 0,
		cy = 0,
		radius = 1,
		startAngle = 0,
		endAngle = Math.PI * 2,
		clockwise = false,
	) {
		super(cx, cy, radius, radius, startAngle, endAngle, clockwise);
	}
}
