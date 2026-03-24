import { EllipseCurve } from "./EllipseCurve.ts";

/** Circular arc curve (EllipseCurve with equal radii). */
export class ArcCurve extends EllipseCurve {
	override type = "ArcCurve";

	constructor(
		cx = 0,
		cy = 0,
		radius = 1,
		startAngle = 0,
		endAngle: number = Math.PI * 2,
		clockwise = false,
	) {
		super(cx, cy, radius, radius, startAngle, endAngle, clockwise);
	}
}
