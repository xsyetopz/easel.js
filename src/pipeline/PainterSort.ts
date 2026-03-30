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
	#layerKeys: number[] = [];
	#layerBuckets: Map<number, DrawCall[]> = new Map();

	/**
	 * Runs the full painter's algorithm sort chain:
	 * tile distance (back-to-front) -> material layer -> opaque/transparent split.
	 * Opaques are reversed to front-to-back so early-Z rejects overdraw.
	 * Transparents stay back-to-front for correct blending.
	 */
	sort(drawList: DrawList, cameraPosition: { x: number; y: number }): void {
		const calls = drawList.calls;
		const n = calls.length;
		if (n < 2) {
			for (const drawCall of drawList) {
				this.#polygonSorter.sort(
					drawCall as {
						triangles: { length: number; buildSortOrder(): void } | undefined;
					},
				);
			}
			return;
		}

		// Fast path: when everything is fully opaque, ordering is a performance hint.
		// The depth buffer guarantees correctness, so avoid the expensive distance sort.
		let allOpaque = true;
		const firstLayer = calls[0].material.layer;
		let hasMultipleLayers = false;
		for (let i = 0; i < n; i++) {
			const mat = calls[i].material;
			if (mat.opacity !== 0) {
				allOpaque = false;
				break;
			}
			if (mat.layer !== firstLayer) hasMultipleLayers = true;
		}

		if (allOpaque) {
			if (hasMultipleLayers) {
				const buckets = this.#layerBuckets;
				const keys = this.#layerKeys;
				keys.length = 0;

				for (let i = 0; i < n; i++) {
					const dc = calls[i];
					const layer = dc.material.layer;
					let bucket = buckets.get(layer);
					if (!bucket) {
						bucket = [];
						buckets.set(layer, bucket);
						keys.push(layer);
					}
					bucket.push(dc);
				}

				keys.sort((a, b) => a - b);
				let out = 0;
				for (const layer of keys) {
					const bucket = buckets.get(layer);
					if (!bucket) continue;
					for (const dc of bucket) {
						calls[out++] = dc;
					}
					bucket.length = 0;
				}
				calls.length = out;
				keys.length = 0;
			}

			for (const drawCall of drawList) {
				this.#polygonSorter.sort(
					drawCall as {
						triangles: { length: number; buildSortOrder(): void } | undefined;
					},
				);
			}
			return;
		}

		this.#tileSorter.sort(drawList, cameraPosition);
		this.#prioritySorter.sort(drawList);
		const opaque = this.#opaque;
		const transparent = this.#transparent;
		opaque.length = 0;
		transparent.length = 0;

		for (let i = 0; i < n; i++) {
			const dc = calls[i];
			if (dc.material.opacity === 0) {
				opaque.push(dc);
			} else {
				transparent.push(dc);
			}
		}

		// Reverse opaques within each layer group: back-to-front -> front-to-back
		const oLen = opaque.length;
		let groupStart = 0;
		while (groupStart < oLen) {
			const layer = opaque[groupStart].material.layer;
			let groupEnd = groupStart + 1;
			while (groupEnd < oLen && opaque[groupEnd].material.layer === layer) {
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
