interface TriangleBuffer {
	length: number;
	buildSortOrder(): void;
	sort(): void;
}

interface SortMaterial {
	transparent?: boolean;
	depthTest?: boolean;
	depthWrite?: boolean;
}

/**
 * Builds the iteration order for triangles within a draw call.
 * The depth buffer handles per-pixel correctness, so no Z-sort is needed.
 */
export class PolygonSorter {
	/** Prepares triangle iteration order only when depth buffering cannot guarantee correctness. */
	sort(drawCall: {
		material?: SortMaterial;
		triangles: TriangleBuffer | undefined;
	}): void {
		const buf = drawCall.triangles;
		if (!buf || buf.length < 2) return;
		const material = drawCall.material;
		const depthBuffered =
			material?.depthTest !== false && material?.depthWrite !== false;
		if (material?.transparent === true || !depthBuffered) {
			buf.sort();
		}
	}
}
