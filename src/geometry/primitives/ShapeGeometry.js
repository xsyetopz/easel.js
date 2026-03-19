// STUB: depends on Shape and curve utilities (../../curves/Shape.js)
import { Geometry } from "../Geometry.js";

/**
 * Triangulates a flat Shape into a filled 2D geometry on the XY plane.
 * Curve-dependent triangulation is stubbed pending Shape.getPoints().
 */
export class ShapeGeometry extends Geometry {
	/**
	 * @param {import('../../curves/Shape.js').Shape|import('../../curves/Shape.js').Shape[]} shapes
	 * @param {number} [curveSegments=12]
	 */
	constructor(shapes, curveSegments = 12) {
		super();

		this.type = "ShapeGeometry";
		this.parameters = { shapes, curveSegments };

		// STUB: call shapes.getPoints(curveSegments), triangulate the 2D contour,
		// assign z=0, normals=(0,0,1), uvs from bounding box.
		// Requires Shape.getPoints() - implement when curves/Shape.js lands.

		this.setPositions(new Float32Array(0));
		this.setNormals(new Float32Array(0));
		this.setUVs(new Float32Array(0));
		this.setIndex(new Uint16Array(0));
	}
}
