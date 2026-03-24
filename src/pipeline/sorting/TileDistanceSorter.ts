import type { DrawCall } from "../DrawCall.ts";

interface SortableDrawList {
	calls: DrawCall[];
}

/** Sorts draw calls by tile distance from camera. */
export class TileDistanceSorter {
	/** Reusable map to avoid per-frame allocation. */
	#distMap: Map<DrawCall, number> = new Map();

	/** Sorts draw calls back-to-front by Manhattan tile distance from camera. */
	sort(
		drawList: SortableDrawList,
		cameraPosition: { x: number; y: number },
	): void {
		const calls = drawList.calls;
		const n = calls.length;
		const dm = this.#distMap;
		dm.clear();

		const cx = cameraPosition.x;
		const cy = cameraPosition.y;
		for (let i = 0; i < n; i++) {
			const call = calls[i];
			const c = call.centroid;
			dm.set(call, Math.abs(c.x - cx) + Math.abs(c.y - cy));
		}

		calls.sort(
			(a: DrawCall, b: DrawCall) =>
				(dm.get(b) as number) - (dm.get(a) as number),
		);
	}
}
