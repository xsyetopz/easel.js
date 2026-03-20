import { Vector3 } from "../math/Vector3.js";

const _pos = new Vector3();

/** Single polygon draw operation with material, depth, and vertex data. */
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

	/** @type {Float32Array} */
	worldPositions = new Float32Array(0);

	/**
	 * Flat typed array for baked shading colors.
	 * Flat shading: stride 3 (r,g,b per face). Gouraud: stride 9 (r,g,b × 3 vertices).
	 * @type {Float32Array}
	 */
	shadedColorData = new Float32Array(0);

	/**
	 * Stride into shadedColorData: 3 for flat, 9 for gouraud, 0 when unset.
	 * @type {number}
	 */
	shadedColorStride = 0;

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
	 * Computes the draw call's centroid from the mesh's bounding sphere
	 * center (world-space). Falls back to mesh origin when no bounding
	 * sphere is available.
	 * @returns {void}
	 */
	#computeCentroid() {
		const bs = this.mesh.geometry?.boundingSphere;
		if (bs) {
			_pos.copy(bs.centre).applyMatrix4(this.mesh.matrixWorld);
		} else {
			_pos.setFromMatrixPosition(this.mesh.matrixWorld);
		}
		this.centroid.x = _pos.x;
		this.centroid.y = _pos.y;
		this.centroid.z = _pos.z;
	}
}
