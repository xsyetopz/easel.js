import { DrawPrioritySorter } from "./sorting/DrawPrioritySorter.js";
import { PolygonSorter } from "./sorting/PolygonSorter.js";
import { TileDistanceSorter } from "./sorting/TileDistanceSorter.js";

/** Back-to-front painter's algorithm sorter for draw calls. */
export class PainterSort {
	#tileSorter = new TileDistanceSorter();
	#prioritySorter = new DrawPrioritySorter();
	#polygonSorter = new PolygonSorter();

	/**
	 * Runs the full painter's algorithm sort chain:
	 * tile distance (back-to-front) → material layer → per-polygon depth.
	 * @param {*} drawList
	 * @param {{ x: number, y: number }} cameraPosition
	 * @returns {void}
	 */
	sort(drawList, cameraPosition) {
		this.#tileSorter.sort(drawList, cameraPosition);
		this.#prioritySorter.sort(drawList);
		for (const drawCall of drawList) {
			this.#polygonSorter.sort(drawCall);
		}
	}
}
