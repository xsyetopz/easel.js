interface TriangleBuffer {
	length: number;
	buildSortOrder(): void;
}

/**
 * Builds the iteration order for triangles within a draw call.
 * The depth buffer handles per-pixel correctness, so no Z-sort is needed.
 */
export class PolygonSorter {
	/** Prepares triangle iteration order (identity mapping). */
	sort(drawCall: { triangles: TriangleBuffer | undefined }): void {
		const buf = drawCall.triangles;
		if (!buf || buf.length < 2) return;
		buf.buildSortOrder();
	}
}
