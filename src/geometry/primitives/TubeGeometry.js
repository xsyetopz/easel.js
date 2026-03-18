// STUB: depends on Curve3D (../../curves/Curve3D.js)
import { Geometry } from "../Geometry.js";

/**
 * Generates a tube that extrudes along a 3D curve path.
 * Curve-dependent frame computation is stubbed pending Curve3D.
 */
export class TubeGeometry extends Geometry {
	/**
	 * @param {object} path - A Curve3D instance with getPoints(segments) and getTangent(t).
	 * @param {number} [tubularSegments=64]
	 * @param {number} [radius=1]
	 * @param {number} [radialSegments=8]
	 * @param {boolean} [closed=false]
	 */
	constructor(
		path,
		tubularSegments = 64,
		radius = 1,
		radialSegments = 8,
		closed = false,
	) {
		super();

		this.type = "TubeGeometry";
		this.parameters = { path, tubularSegments, radius, radialSegments, closed };

		// STUB: compute rotation-minimizing frames along path.getPoints(tubularSegments),
		// build ring cross-sections at each frame, connect rings with quads.
		// Requires Curve3D.getPoints() and Curve3D.getTangent() — implement when curves land.

		this.setPositions(new Float32Array(0));
		this.setNormals(new Float32Array(0));
		this.setUVs(new Float32Array(0));
		this.setIndex(new Uint16Array(0));
	}
}
