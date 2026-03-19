export class TriangleBuffer {
	/** @type {number} Number of triangles currently stored. */
	length = 0;

	/** @type {number} Allocated capacity in triangles. */
	#capacity;

	/** @type {Int32Array} Screen-space X for 3 vertices per triangle (stride 3). */
	screenX = new Int32Array(0);

	/** @type {Int32Array} Screen-space Y for 3 vertices per triangle (stride 3). */
	screenY = new Int32Array(0);

	/** @type {Float32Array} NDC Z for 3 vertices per triangle (stride 3). */
	ndcZ = new Float32Array(0);

	/** @type {Float32Array} Face normal X (stride 1). */
	faceNormalX = new Float32Array(0);

	/** @type {Float32Array} Face normal Y (stride 1). */
	faceNormalY = new Float32Array(0);

	/** @type {Float32Array} Face normal Z (stride 1). */
	faceNormalZ = new Float32Array(0);

	/** @type {Float32Array} Vertex normal X for 3 vertices per triangle (stride 3). */
	vertNormalX = new Float32Array(0);

	/** @type {Float32Array} Vertex normal Y for 3 vertices per triangle (stride 3). */
	vertNormalY = new Float32Array(0);

	/** @type {Float32Array} Vertex normal Z for 3 vertices per triangle (stride 3). */
	vertNormalZ = new Float32Array(0);

	/** @type {Float32Array} UV U coordinate for 3 vertices per triangle (stride 3). */
	uvU = new Float32Array(0);

	/** @type {Float32Array} UV V coordinate for 3 vertices per triangle (stride 3). */
	uvV = new Float32Array(0);

	/** @type {Float32Array} World-space X for 3 vertices per triangle (stride 3). */
	worldX = new Float32Array(0);

	/** @type {Float32Array} World-space Y for 3 vertices per triangle (stride 3). */
	worldY = new Float32Array(0);

	/** @type {Float32Array} World-space Z for 3 vertices per triangle (stride 3). */
	worldZ = new Float32Array(0);

	/** @type {Float32Array} Per-vertex fog factor for 3 vertices per triangle (stride 3). 0 = no fog, 1 = fully fogged. */
	fogFactor = new Float32Array(0);

	/** @type {Float32Array} Centroid Z = (z0+z1+z2)/3, used for painter sort (stride 1). */
	centroidZ = new Float32Array(0);

	/** @type {number[]} Iteration index → physical triangle index, populated by buildSortOrder/sort. */
	sortOrder = [];

	/** @param {number} [capacity=64] Initial capacity in triangles. */
	constructor(capacity = 64) {
		this.#capacity = capacity;
		this.#allocate(capacity);
	}

	/**
	 * Allocate all typed arrays at the given capacity.
	 * @param {number} capacity
	 */
	#allocate(capacity) {
		this.screenX = new Int32Array(capacity * 3);
		this.screenY = new Int32Array(capacity * 3);
		this.ndcZ = new Float32Array(capacity * 3);
		this.faceNormalX = new Float32Array(capacity);
		this.faceNormalY = new Float32Array(capacity);
		this.faceNormalZ = new Float32Array(capacity);
		this.vertNormalX = new Float32Array(capacity * 3);
		this.vertNormalY = new Float32Array(capacity * 3);
		this.vertNormalZ = new Float32Array(capacity * 3);
		this.uvU = new Float32Array(capacity * 3);
		this.uvV = new Float32Array(capacity * 3);
		this.centroidZ = new Float32Array(capacity);
		this.worldX = new Float32Array(capacity * 3);
		this.worldY = new Float32Array(capacity * 3);
		this.worldZ = new Float32Array(capacity * 3);
		this.fogFactor = new Float32Array(capacity * 3);
	}

	/** Reset length to 0, preserving allocated arrays for reuse. */
	reset() {
		this.length = 0;
	}

	/**
	 * Grow all arrays to at least the given capacity using 2× doubling.
	 * Copies existing data into new arrays.
	 * @param {number} needed
	 */
	ensureCapacity(needed) {
		if (needed <= this.#capacity) return;

		let next = this.#capacity === 0 ? 1 : this.#capacity;
		while (next < needed) next *= 2;

		const prev = {
			screenX: this.screenX,
			screenY: this.screenY,
			ndcZ: this.ndcZ,
			faceNormalX: this.faceNormalX,
			faceNormalY: this.faceNormalY,
			faceNormalZ: this.faceNormalZ,
			vertNormalX: this.vertNormalX,
			vertNormalY: this.vertNormalY,
			vertNormalZ: this.vertNormalZ,
			uvU: this.uvU,
			uvV: this.uvV,
			centroidZ: this.centroidZ,
			worldX: this.worldX,
			worldY: this.worldY,
			worldZ: this.worldZ,
			fogFactor: this.fogFactor,
		};

		this.#capacity = next;
		this.#allocate(next);

		this.screenX.set(prev.screenX);
		this.screenY.set(prev.screenY);
		this.ndcZ.set(prev.ndcZ);
		this.faceNormalX.set(prev.faceNormalX);
		this.faceNormalY.set(prev.faceNormalY);
		this.faceNormalZ.set(prev.faceNormalZ);
		this.vertNormalX.set(prev.vertNormalX);
		this.vertNormalY.set(prev.vertNormalY);
		this.vertNormalZ.set(prev.vertNormalZ);
		this.uvU.set(prev.uvU);
		this.uvV.set(prev.uvV);
		this.centroidZ.set(prev.centroidZ);
		this.worldX.set(prev.worldX);
		this.worldY.set(prev.worldY);
		this.worldZ.set(prev.worldZ);
		this.fogFactor.set(prev.fogFactor);
	}

	/**
	 * Append one triangle. CentroidZ is computed from z0, z1, z2.
	 * @param {number} sx0 Screen X vertex 0
	 * @param {number} sy0 Screen Y vertex 0
	 * @param {number} sx1 Screen X vertex 1
	 * @param {number} sy1 Screen Y vertex 1
	 * @param {number} sx2 Screen X vertex 2
	 * @param {number} sy2 Screen Y vertex 2
	 * @param {number} z0 NDC Z vertex 0
	 * @param {number} z1 NDC Z vertex 1
	 * @param {number} z2 NDC Z vertex 2
	 * @param {number} fnx Face normal X
	 * @param {number} fny Face normal Y
	 * @param {number} fnz Face normal Z
	 * @param {number} vn0x Vertex 0 normal X
	 * @param {number} vn0y Vertex 0 normal Y
	 * @param {number} vn0z Vertex 0 normal Z
	 * @param {number} vn1x Vertex 1 normal X
	 * @param {number} vn1y Vertex 1 normal Y
	 * @param {number} vn1z Vertex 1 normal Z
	 * @param {number} vn2x Vertex 2 normal X
	 * @param {number} vn2y Vertex 2 normal Y
	 * @param {number} vn2z Vertex 2 normal Z
	 * @param {number} u0 UV U vertex 0
	 * @param {number} v0 UV V vertex 0
	 * @param {number} u1 UV U vertex 1
	 * @param {number} v1 UV V vertex 1
	 * @param {number} u2 UV U vertex 2
	 * @param {number} v2 UV V vertex 2
	 * @param {number} [wx0=0] World X vertex 0
	 * @param {number} [wy0=0] World Y vertex 0
	 * @param {number} [wz0=0] World Z vertex 0
	 * @param {number} [wx1=0] World X vertex 1
	 * @param {number} [wy1=0] World Y vertex 1
	 * @param {number} [wz1=0] World Z vertex 1
	 * @param {number} [wx2=0] World X vertex 2
	 * @param {number} [wy2=0] World Y vertex 2
	 * @param {number} [wz2=0] World Z vertex 2
	 * @param {number} [ff0=0] Fog factor vertex 0 (0=clear, 1=fully fogged)
	 * @param {number} [ff1=0] Fog factor vertex 1
	 * @param {number} [ff2=0] Fog factor vertex 2
	 * @returns {number} Triangle index of the appended entry
	 */
	append(
		sx0,
		sy0,
		sx1,
		sy1,
		sx2,
		sy2,
		z0,
		z1,
		z2,
		fnx,
		fny,
		fnz,
		vn0x,
		vn0y,
		vn0z,
		vn1x,
		vn1y,
		vn1z,
		vn2x,
		vn2y,
		vn2z,
		u0,
		v0,
		u1,
		v1,
		u2,
		v2,
		wx0 = 0,
		wy0 = 0,
		wz0 = 0,
		wx1 = 0,
		wy1 = 0,
		wz1 = 0,
		wx2 = 0,
		wy2 = 0,
		wz2 = 0,
		ff0 = 0,
		ff1 = 0,
		ff2 = 0,
	) {
		this.ensureCapacity(this.length + 1);

		const i = this.length;
		const i3 = i * 3;

		this.screenX[i3] = sx0;
		this.screenX[i3 + 1] = sx1;
		this.screenX[i3 + 2] = sx2;

		this.screenY[i3] = sy0;
		this.screenY[i3 + 1] = sy1;
		this.screenY[i3 + 2] = sy2;

		this.ndcZ[i3] = z0;
		this.ndcZ[i3 + 1] = z1;
		this.ndcZ[i3 + 2] = z2;

		this.faceNormalX[i] = fnx;
		this.faceNormalY[i] = fny;
		this.faceNormalZ[i] = fnz;

		this.vertNormalX[i3] = vn0x;
		this.vertNormalX[i3 + 1] = vn1x;
		this.vertNormalX[i3 + 2] = vn2x;

		this.vertNormalY[i3] = vn0y;
		this.vertNormalY[i3 + 1] = vn1y;
		this.vertNormalY[i3 + 2] = vn2y;

		this.vertNormalZ[i3] = vn0z;
		this.vertNormalZ[i3 + 1] = vn1z;
		this.vertNormalZ[i3 + 2] = vn2z;

		this.uvU[i3] = u0;
		this.uvU[i3 + 1] = u1;
		this.uvU[i3 + 2] = u2;

		this.uvV[i3] = v0;
		this.uvV[i3 + 1] = v1;
		this.uvV[i3 + 2] = v2;

		this.worldX[i3] = wx0;
		this.worldX[i3 + 1] = wx1;
		this.worldX[i3 + 2] = wx2;

		this.worldY[i3] = wy0;
		this.worldY[i3 + 1] = wy1;
		this.worldY[i3 + 2] = wy2;

		this.worldZ[i3] = wz0;
		this.worldZ[i3 + 1] = wz1;
		this.worldZ[i3 + 2] = wz2;

		this.fogFactor[i3] = ff0;
		this.fogFactor[i3 + 1] = ff1;
		this.fogFactor[i3 + 2] = ff2;

		this.centroidZ[i] = (z0 + z1 + z2) / 3;

		this.length++;
		return i;
	}

	/** Fill sortOrder with identity [0, 1, 2, ...length-1]. */
	buildSortOrder() {
		this.sortOrder.length = this.length;
		for (let i = 0; i < this.length; i++) {
			this.sortOrder[i] = i;
		}
	}

	/** Sort sortOrder by centroidZ descending (back-to-front painter's order). */
	sort() {
		this.buildSortOrder();
		const cz = this.centroidZ;
		this.sortOrder.sort((a, b) => cz[b] - cz[a]);
	}
}
