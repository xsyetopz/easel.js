import { Attribute } from "../geometry/Attribute.js";
import { Geometry } from "../geometry/Geometry.js";
import { LineSegments } from "../objects/LineSegments.js";

/**
 * Ground-plane grid of line segments on the XZ plane.
 */
export class GridHelper extends LineSegments {
	/** @override @type {string} */
	type = "GridHelper";

	/**
	 * @param {number} [size=10]
	 * @param {number} [divisions=10]
	 * @param {number} [color1=0x444444] Center line color
	 * @param {number} [color2=0x888888] Division line color
	 */
	constructor(size = 10, divisions = 10, color1 = 0x444444, color2 = 0x888888) {
		const half = size / 2;
		const step = size / divisions;

		const r1 = ((color1 >> 16) & 0xff) / 255;
		const g1 = ((color1 >> 8) & 0xff) / 255;
		const b1 = (color1 & 0xff) / 255;

		const r2 = ((color2 >> 16) & 0xff) / 255;
		const g2 = ((color2 >> 8) & 0xff) / 255;
		const b2 = (color2 & 0xff) / 255;

		const positions = [];
		const colors = [];

		for (let i = 0; i <= divisions; i++) {
			const t = -half + i * step;
			const isCenter = i === divisions / 2;
			const r = isCenter ? r1 : r2;
			const g = isCenter ? g1 : g2;
			const b = isCenter ? b1 : b2;

			// Line parallel to Z axis
			positions.push(t, 0, -half, t, 0, half);
			colors.push(r, g, b, r, g, b);

			// Line parallel to X axis
			positions.push(-half, 0, t, half, 0, t);
			colors.push(r, g, b, r, g, b);
		}

		const geometry = new Geometry();
		geometry.setAttribute(
			"position",
			new Attribute(new Float32Array(positions), 3),
		);
		geometry.setAttribute("color", new Attribute(new Float32Array(colors), 3));

		super(geometry);
	}

	/** @returns {void} */
	dispose() {
		this.geometry?.dispose();
	}
}
