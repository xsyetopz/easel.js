export class TriangleBuffer {
	/** Number of triangles currently stored. */
	length = 0;

	/** Allocated capacity in triangles. */
	#capacity: number;

	/** Screen-space X for 3 vertices per triangle (stride 3). */
	screenX = new Int32Array(0);

	/** Screen-space Y for 3 vertices per triangle (stride 3). */
	screenY = new Int32Array(0);

	/** NDC Z for 3 vertices per triangle (stride 3). */
	ndcZ = new Float32Array(0);

	/** Face normal X (stride 1). */
	faceNormalX = new Float32Array(0);

	/** Face normal Y (stride 1). */
	faceNormalY = new Float32Array(0);

	/** Face normal Z (stride 1). */
	faceNormalZ = new Float32Array(0);

	/** Vertex normal X for 3 vertices per triangle (stride 3). */
	vertNormalX = new Float32Array(0);

	/** Vertex normal Y for 3 vertices per triangle (stride 3). */
	vertNormalY = new Float32Array(0);

	/** Vertex normal Z for 3 vertices per triangle (stride 3). */
	vertNormalZ = new Float32Array(0);

	/** UV U coordinate for 3 vertices per triangle (stride 3). */
	uvU = new Float32Array(0);

	/** UV V coordinate for 3 vertices per triangle (stride 3). */
	uvV = new Float32Array(0);

	/** World-space X for 3 vertices per triangle (stride 3). */
	worldX = new Float32Array(0);

	/** World-space Y for 3 vertices per triangle (stride 3). */
	worldY = new Float32Array(0);

	/** World-space Z for 3 vertices per triangle (stride 3). */
	worldZ = new Float32Array(0);

	/** Per-vertex fog factor for 3 vertices per triangle (stride 3). 0 = no fog, 1 = fully fogged. */
	fogFactor = new Float32Array(0);

	/** Original geometry vertex index for 3 vertices per triangle (stride 3). */
	vertexIndex = new Int32Array(0);

	/** Highest vertex index seen across all appended triangles. */
	maxVertexIndex = 0;

	/** Centroid Z = (z0+z1+z2)/3, used for painter sort (stride 1). */
	centroidZ = new Float32Array(0);

	/** Iteration index -> physical triangle index, populated by buildSortOrder/sort. */
	sortOrder = new Uint32Array(0);

	constructor(capacity = 64) {
		this.#capacity = capacity;
		this.#allocate(capacity);
	}

	/** Allocate all typed arrays at the given capacity. */
	#allocate(capacity: number): void {
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
		this.vertexIndex = new Int32Array(capacity * 3);
	}

	/** Reset length to 0, preserving allocated arrays for reuse. */
	reset(): void {
		this.length = 0;
		this.maxVertexIndex = 0;
	}

	/** Grow all arrays to at least the given capacity using 2x doubling. Copies existing data. */
	ensureCapacity(needed: number): void {
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
			vertexIndex: this.vertexIndex,
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
		this.vertexIndex.set(prev.vertexIndex);
	}

	/** Append one triangle. CentroidZ is computed from z0, z1, z2. */
	append(
		sx0: number,
		sy0: number,
		sx1: number,
		sy1: number,
		sx2: number,
		sy2: number,
		z0: number,
		z1: number,
		z2: number,
		fnx: number,
		fny: number,
		fnz: number,
		vn0x: number,
		vn0y: number,
		vn0z: number,
		vn1x: number,
		vn1y: number,
		vn1z: number,
		vn2x: number,
		vn2y: number,
		vn2z: number,
		u0: number,
		v0: number,
		u1: number,
		v1: number,
		u2: number,
		v2: number,
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
		vi0 = 0,
		vi1 = 0,
		vi2 = 0,
	): number {
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

		this.vertexIndex[i3] = vi0;
		this.vertexIndex[i3 + 1] = vi1;
		this.vertexIndex[i3 + 2] = vi2;
		if (vi0 > this.maxVertexIndex) this.maxVertexIndex = vi0;
		if (vi1 > this.maxVertexIndex) this.maxVertexIndex = vi1;
		if (vi2 > this.maxVertexIndex) this.maxVertexIndex = vi2;

		this.centroidZ[i] = (z0 + z1 + z2) / 3;

		this.length++;
		return i;
	}

	/** Fill sortOrder with identity [0, 1, 2, ...length-1]. */
	buildSortOrder(): void {
		if (this.sortOrder.length !== this.length) {
			this.sortOrder = new Uint32Array(this.length);
		}
		for (let i = 0; i < this.length; i++) {
			this.sortOrder[i] = i;
		}
	}

	/** Sort sortOrder by centroidZ descending (back-to-front painter's order). */
	sort(): void {
		this.buildSortOrder();
		this.#sortCz = this.centroidZ;
		this.sortOrder.sort(this.#comparator);
	}

	/** Reference held during sort to avoid closure allocation. */
	#sortCz: Float32Array = new Float32Array(0);

	/** Bound comparator, allocated once. */
	#comparator = (a: number, b: number): number =>
		this.#sortCz[b] - this.#sortCz[a];
}
