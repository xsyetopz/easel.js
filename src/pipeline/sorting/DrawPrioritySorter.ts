interface DrawCall {
	material: { layer: number };
}

interface DrawList {
	calls: DrawCall[];
}

function compareByLayer(a: DrawCall, b: DrawCall): number {
	return a.material.layer - b.material.layer;
}

/** Sorts draw calls by material layer priority. */
export class DrawPrioritySorter {
	/**
	 * Stable-sorts draw calls by material.layer (lower layer first).
	 * Preserves relative order from TileDistanceSorter within the same layer.
	 */
	sort(drawList: DrawList): void {
		const calls = drawList.calls;
		calls.sort(compareByLayer);
	}
}
