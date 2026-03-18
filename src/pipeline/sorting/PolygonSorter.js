export class PolygonSorter {
	/**
	 * Sorts triangles within a draw call back-to-front by centroid Z depth.
	 * Triangles must have a `centroidZ` property set during assembly.
	 * @param {{ triangles: Array<{ centroidZ: number }> }} drawCall
	 * @returns {void}
	 */
	sort(drawCall) {
		const { triangles } = drawCall;
		if (!triangles || triangles.length < 2) return;

		// Back-to-front: highest projected Z (farthest in NDC) renders first
		triangles.sort((a, b) => b.centroidZ - a.centroidZ);
	}
}
