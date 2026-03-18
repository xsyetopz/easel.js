import { Vector3 } from "../math/Vector3.js";

const _pos = new Vector3();

export class DrawCall {
	/** @type {import('../objects/Mesh.js').Mesh} */
	mesh;

	/** @type {Array<{ x: number, y: number, z: number }>} */
	projectedVerts = [];

	/** @type {import('../materials/Material.js').Material} */
	material;

	/** @type {number[]} */
	faceIndices = [];

	/** @type {{ x: number, y: number, z: number }} */
	centroid = { x: 0, y: 0, z: 0 };

	/** @type {number[]} */
	shadedColors = [];

	/** @type {number} */
	_sortIndex = 0;

	/**
	 * @param {import('../objects/Mesh.js').Mesh} mesh
	 * @param {import('../materials/Material.js').Material} material
	 */
	constructor(mesh, material) {
		this.mesh = mesh;
		this.material = material;
		this.#computeCentroid();
	}

	/**
	 * Computes the draw call's centroid from the mesh world-space position.
	 * @returns {void}
	 */
	#computeCentroid() {
		_pos.setFromMatrixPosition(this.mesh.matrixWorld);
		this.centroid.x = _pos.x;
		this.centroid.y = _pos.y;
		this.centroid.z = _pos.z;
	}
}
