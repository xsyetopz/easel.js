/**
 * @typedef {{
 *   screenVerts: Array<{ x: number, y: number }>,
 *   centroidZ: number,
 *   [key: string]: unknown
 * }} SortableTriangle
 */

/**
 * Centroid-Z depth sorting for painter's algorithm rendering.
 * The depth buffer handles residual overlap errors.
 */
export class PolygonSorter {
	/**
	 * Sorts triangles within a draw call back-to-front by centroid Z.
	 * @param {{ triangles: SortableTriangle[] }} drawCall
	 * @returns {void}
	 */
	sort(drawCall) {
		const { triangles } = drawCall;
		if (!triangles || triangles.length < 2) return;
		triangles.sort((a, b) => b.centroidZ - a.centroidZ);
	}
}
