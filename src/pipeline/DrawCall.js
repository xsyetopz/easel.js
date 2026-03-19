import { Vector3 } from "../math/Vector3.js";

const _pos = new Vector3();

export class DrawCall {
	/** @type {import('../objects/Mesh.js').Mesh} */
	mesh;

	/**
	 * Flat Float32Array of projected vertex data, stride 4.
	 * Layout per vertex: [x, y, z, w] (NDC xyz, clip-space w).
	 * @type {Float32Array}
	 */
	projectedVerts = new Float32Array(0);

	/** @type {number} */
	vertCount = 0;

	/** @type {import('../materials/Material.js').Material} */
	material;

	/** @type {number[] | Uint16Array | Uint32Array} */
	faceIndices = [];

	/** @type {{ x: number, y: number, z: number }} */
	centroid = { x: 0, y: 0, z: 0 };

	/** @type {import('./TriangleBuffer.js').TriangleBuffer} */
	triangles = /** @type {*} */ (undefined);

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
