import { MathUtils } from "../../math/MathUtils.js";

export class TileDistanceSorter {
	/**
	 * Sorts draw calls back-to-front by Manhattan tile distance from camera.
	 * @param {import('../DrawList.js').DrawList} drawList
	 * @param {{ x: number, y: number }} cameraPosition
	 * @returns {void}
	 */
	sort(drawList, cameraPosition) {
		drawList.calls.sort((a, b) => {
			const da = MathUtils.tileDistance(a.centroid, cameraPosition);
			const db = MathUtils.tileDistance(b.centroid, cameraPosition);
			return db - da;
		});
	}
}
