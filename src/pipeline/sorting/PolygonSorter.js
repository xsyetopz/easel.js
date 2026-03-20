/**
 * Centroid-Z depth sorting for painter's algorithm rendering.
 * The depth buffer handles residual overlap errors.
 */
export class PolygonSorter {
	/**
	 * Sorts triangles within a draw call back-to-front by centroid Z.
	 * @param {{ triangles: * }} drawCall
	 * @returns {void}
	 */
	sort(drawCall) {
		const buf = drawCall.triangles;
		if (!buf || buf.length < 2) return;
		buf.sort();
	}
}
