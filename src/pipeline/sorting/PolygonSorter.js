export class PolygonSorter {
	/**
	 * Sorts triangles within a draw call back-to-front by centroid Z depth.
	 * Expects drawCall.faceIndices to be a flat array of vertex index triples
	 * and drawCall.projectedVerts to provide z values per vertex.
	 * @param {{ faceIndices: number[], projectedVerts: Array<{ z: number }> }} drawCall
	 * @returns {void}
	 */
	sort(drawCall) {
		const { faceIndices, projectedVerts } = drawCall;
		if (!faceIndices || faceIndices.length < 3) return;

		const triCount = Math.floor(faceIndices.length / 3);
		const tris = new Array(triCount);

		for (let i = 0; i < triCount; i++) {
			const base = i * 3;
			const i0 = faceIndices[base];
			const i1 = faceIndices[base + 1];
			const i2 = faceIndices[base + 2];
			const centroidZ =
				(projectedVerts[i0].z + projectedVerts[i1].z + projectedVerts[i2].z) /
				3;
			tris[i] = { i0, i1, i2, centroidZ };
		}

		// Back-to-front: highest Z (farthest) first
		tris.sort((a, b) => b.centroidZ - a.centroidZ);

		for (let i = 0; i < triCount; i++) {
			const base = i * 3;
			faceIndices[base] = tris[i].i0;
			faceIndices[base + 1] = tris[i].i1;
			faceIndices[base + 2] = tris[i].i2;
		}
	}
}
