import { PolyhedronGeometry } from "./PolyhedronGeometry.js";

const _vertices = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];

const _indices = [
	0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 3, 1, 3, 4, 1, 4, 2,
];

/**
 * Octahedron geometry.
 */
export class OctahedronGeometry extends PolyhedronGeometry {
	/**
	 * @param {number} [radius=1]
	 * @param {number} [detail=0]
	 */
	constructor(radius = 1, detail = 0) {
		super(_vertices, _indices, radius, detail);
		this.type = "OctahedronGeometry";
		this.parameters = { radius, detail };
	}
}
