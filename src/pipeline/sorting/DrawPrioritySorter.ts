interface DrawCall {
	material?: { layer?: number };
	_sortIndex: number;
}

interface DrawList {
	calls: DrawCall[];
}

/** Sorts draw calls by material layer priority. */
export class DrawPrioritySorter {
	/**
	 * Stable-sorts draw calls by material.layer (lower layer first).
	 * Preserves relative order from TileDistanceSorter within the same layer.
	 */
	sort(drawList: DrawList): void {
		const calls = drawList.calls;
		// Tag with original index for stable sort
		for (let i = 0; i < calls.length; i++) {
			calls[i]._sortIndex = i;
		}
		calls.sort((a: DrawCall, b: DrawCall) => {
			const la = a.material?.layer ?? 0;
			const lb = b.material?.layer ?? 0;
			if (la !== lb) return la - lb;
			return a._sortIndex - b._sortIndex;
		});
	}
}
