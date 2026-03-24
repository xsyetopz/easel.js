import type { DrawCall } from "./DrawCall.ts";
import type { DrawList } from "./DrawList.ts";
import { DrawPrioritySorter } from "./sorting/DrawPrioritySorter.ts";
import { PolygonSorter } from "./sorting/PolygonSorter.ts";
import { TileDistanceSorter } from "./sorting/TileDistanceSorter.ts";

/**
 * Painter's algorithm sorter with front-to-back opaque rendering.
 * Opaque meshes render first (front-to-back for early-Z rejection),
 * then transparent meshes render back-to-front for correct blending.
 */
export class PainterSort {
	#tileSorter = new TileDistanceSorter();
	#prioritySorter = new DrawPrioritySorter();
	#polygonSorter = new PolygonSorter();
	#opaque: DrawCall[] = [];
	#transparent: DrawCall[] = [];

	/**
	 * Runs the full painter's algorithm sort chain:
	 * tile distance (back-to-front) -> material layer -> opaque/transparent split.
	 * Opaques are reversed to front-to-back so early-Z rejects overdraw.
	 * Transparents stay back-to-front for correct blending.
	 */
	sort(drawList: DrawList, cameraPosition: { x: number; y: number }): void {
		this.#tileSorter.sort(drawList, cameraPosition);
		this.#prioritySorter.sort(drawList);

		const calls = drawList.calls;
		const n = calls.length;
		const opaque = this.#opaque;
		const transparent = this.#transparent;
		opaque.length = 0;
		transparent.length = 0;

		for (let i = 0; i < n; i++) {
			const dc = calls[i];
			if ((dc.material?.opacity ?? 0) === 0) {
				opaque.push(dc);
			} else {
				transparent.push(dc);
			}
		}

		// Reverse opaques within each layer group: back-to-front -> front-to-back
		const oLen = opaque.length;
		let groupStart = 0;
		while (groupStart < oLen) {
			const layer = opaque[groupStart].material?.layer ?? 0;
			let groupEnd = groupStart + 1;
			while (
				groupEnd < oLen &&
				(opaque[groupEnd].material?.layer ?? 0) === layer
			) {
				groupEnd++;
			}
			for (let i = groupStart, j = groupEnd - 1; i < j; i++, j--) {
				const tmp = opaque[i];
				opaque[i] = opaque[j];
				opaque[j] = tmp;
			}
			groupStart = groupEnd;
		}

		// Rebuild calls: opaques first, then transparents
		calls.length = 0;
		for (let i = 0; i < oLen; i++) calls.push(opaque[i]);
		const tLen = transparent.length;
		for (let i = 0; i < tLen; i++) calls.push(transparent[i]);

		for (const drawCall of drawList) {
			this.#polygonSorter.sort(
				drawCall as {
					triangles: { length: number; buildSortOrder(): void } | undefined;
				},
			);
		}
	}
}
