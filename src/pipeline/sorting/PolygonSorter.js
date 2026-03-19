/**
 * @typedef {{
 *   screenVerts: Array<{ x: number, y: number }>,
 *   centroidZ: number,
 *   minZ?: number,
 *   maxZ?: number,
 *   ndcVerts?: Array<{ x: number, y: number, z: number }>,
 *   [key: string]: unknown
 * }} SortableTriangle
 */

/**
 * Newell's algorithm for depth sorting of potentially overlapping polygons.
 * Falls back to centroid-Z when Z-ranges don't overlap.
 */
export class PolygonSorter {
	/**
	 * Sorts triangles within a draw call back-to-front using Newell's algorithm.
	 * @param {{ triangles: SortableTriangle[] }} drawCall
	 * @returns {void}
	 */
	sort(drawCall) {
		const { triangles } = drawCall;
		if (!triangles || triangles.length < 2) return;

		// Ensure bounds exist on all triangles
		for (const tri of triangles) {
			if (tri.minZ === undefined || tri.maxZ === undefined) {
				triangles.sort((a, b) => b.centroidZ - a.centroidZ);
				return;
			}
		}

		triangles.sort(
			(a, b) => /** @type {number} */ (b.maxZ) - /** @type {number} */ (a.maxZ),
		);

		const len = triangles.length;
		for (let i = 0; i < len - 1; i++) {
			const p = triangles[i];
			for (let j = i + 1; j < len; j++) {
				const q = triangles[j];

				if (/** @type {number} */ (p.minZ) >= /** @type {number} */ (q.maxZ)) {
					break;
				}

				if (this.#shouldSwap(p, q)) {
					triangles[i] = q;
					triangles[j] = p;
					break;
				}
			}
		}
	}

	/**
	 * @param {SortableTriangle} p
	 * @param {SortableTriangle} q
	 * @returns {boolean}
	 */
	#shouldSwap(p, q) {
		if (this.#xSeparated(p, q)) return false;
		if (this.#ySeparated(p, q)) return false;
		if (
			q.ndcVerts &&
			p.ndcVerts &&
			this.#allBehindPlane(p.ndcVerts, q.ndcVerts)
		)
			return false;
		if (
			p.ndcVerts &&
			q.ndcVerts &&
			this.#allInFrontOfPlane(q.ndcVerts, p.ndcVerts)
		)
			return false;
		return true;
	}

	/**
	 * @param {SortableTriangle} a
	 * @param {SortableTriangle} b
	 * @returns {boolean}
	 */
	#xSeparated(a, b) {
		const aVerts = a.screenVerts;
		const bVerts = b.screenVerts;

		let [aMinX, aMaxX] = [aVerts[0].x, aVerts[0].x];
		let [bMinX, bMaxX] = [bVerts[0].x, bVerts[0].x];

		for (let i = 1; i < aVerts.length; i++) {
			if (aVerts[i].x < aMinX) aMinX = aVerts[i].x;
			if (aVerts[i].x > aMaxX) aMaxX = aVerts[i].x;
		}
		for (let i = 1; i < bVerts.length; i++) {
			if (bVerts[i].x < bMinX) bMinX = bVerts[i].x;
			if (bVerts[i].x > bMaxX) bMaxX = bVerts[i].x;
		}

		return aMaxX < bMinX || aMinX > bMaxX;
	}

	/**
	 * @param {SortableTriangle} a
	 * @param {SortableTriangle} b
	 * @returns {boolean}
	 */
	#ySeparated(a, b) {
		const aVerts = a.screenVerts;
		const bVerts = b.screenVerts;

		let [aMinY, aMaxY] = [aVerts[0].y, aVerts[0].y];
		let [bMinY, bMaxY] = [bVerts[0].y, bVerts[0].y];

		for (let i = 1; i < aVerts.length; i++) {
			if (aVerts[i].y < aMinY) aMinY = aVerts[i].y;
			if (aVerts[i].y > aMaxY) aMaxY = aVerts[i].y;
		}
		for (let i = 1; i < bVerts.length; i++) {
			if (bVerts[i].y < bMinY) bMinY = bVerts[i].y;
			if (bVerts[i].y > bMaxY) bMaxY = bVerts[i].y;
		}

		return aMaxY < bMinY || aMinY > bMaxY;
	}

	/**
	 * Returns true if all vertices in `testVerts` are on the far side (positive)
	 * of the plane defined by `planeVerts`.
	 * @param {Array<{ x: number, y: number, z: number }>} testVerts
	 * @param {Array<{ x: number, y: number, z: number }>} planeVerts
	 * @returns {boolean}
	 */
	#allBehindPlane(testVerts, planeVerts) {
		const plane = this.#planeFromTriangle(
			planeVerts[0],
			planeVerts[1],
			planeVerts[2],
		);
		for (const v of testVerts) {
			if (plane.nx * v.x + plane.ny * v.y + plane.nz * v.z + plane.d < 0) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Returns true if all vertices in `testVerts` are on the near side (negative)
	 * of the plane defined by `planeVerts`.
	 * @param {Array<{ x: number, y: number, z: number }>} testVerts
	 * @param {Array<{ x: number, y: number, z: number }>} planeVerts
	 * @returns {boolean}
	 */
	#allInFrontOfPlane(testVerts, planeVerts) {
		const plane = this.#planeFromTriangle(
			planeVerts[0],
			planeVerts[1],
			planeVerts[2],
		);
		for (const v of testVerts) {
			if (plane.nx * v.x + plane.ny * v.y + plane.nz * v.z + plane.d > 0) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @param {{ x: number, y: number, z: number }} a
	 * @param {{ x: number, y: number, z: number }} b
	 * @param {{ x: number, y: number, z: number }} c
	 * @returns {{ nx: number, ny: number, nz: number, d: number }}
	 */
	#planeFromTriangle(a, b, c) {
		const [abx, aby, abz] = [b.x - a.x, b.y - a.y, b.z - a.z];
		const [acx, acy, acz] = [c.x - a.x, c.y - a.y, c.z - a.z];

		const nx = aby * acz - abz * acy;
		const ny = abz * acx - abx * acz;
		const nz = abx * acy - aby * acx;
		const d = -(nx * a.x + ny * a.y + nz * a.z);
		return { nx, ny, nz, d };
	}
}
