// STUB: depends on Shape and curve utilities (../../curves/Shape.js)
import { Geometry } from "../Geometry.js";

/**
 * Extrudes one or more Shape objects along the Z axis.
 * Curve-dependent triangulation is stubbed pending Shape.getPoints().
 */
export class ExtrudeGeometry extends Geometry {
	/**
	 * @param {*|*[]} shapes
	 * @param {object} [options]
	 * @param {number} [options.depth=1]
	 * @param {number} [options.steps=1]
	 * @param {boolean} [options.bevelEnabled=false]
	 * @param {number} [options.bevelThickness=0.1]
	 * @param {number} [options.bevelSize=0.05]
	 * @param {number} [options.bevelSegments=1]
	 */
	constructor(shapes, options = {}) {
		super();

		this.type = "ExtrudeGeometry";
		this.parameters = { shapes, options };

		// STUB: triangulate shape points, extrude along Z by options.depth,
		// generate side faces between front and back contour, handle bevel.
		// Requires Shape.getPoints() - implement when curves/Shape.js lands.

		this.setPositions(new Float32Array(0));
		this.setNormals(new Float32Array(0));
		this.setUVs(new Float32Array(0));
		this.setIndex(new Uint16Array(0));
	}
}
