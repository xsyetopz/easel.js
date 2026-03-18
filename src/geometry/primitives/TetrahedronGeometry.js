import { PolyhedronGeometry } from "./PolyhedronGeometry.js";

const _vertices = [1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1];

const _indices = [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1];

/**
 * Tetrahedron geometry.
 */
export class TetrahedronGeometry extends PolyhedronGeometry {
	/**
	 * @param {number} [radius=1]
	 * @param {number} [detail=0]
	 */
	constructor(radius = 1, detail = 0) {
		super(_vertices, _indices, radius, detail);
		this.type = "TetrahedronGeometry";
		this.parameters = { radius, detail };
	}
}
