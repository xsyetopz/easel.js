import { MathUtils } from "../../math/MathUtils.js";

/** Sorts draw calls by tile distance from camera. */
export class TileDistanceSorter {
	/**
	 * Sorts draw calls back-to-front by Manhattan tile distance from camera.
	 * @param {*} drawList
	 * @param {{ x: number, y: number }} cameraPosition
	 * @returns {void}
	 */
	sort(drawList, cameraPosition) {
		drawList.calls.sort((/** @type {*} */ a, /** @type {*} */ b) => {
			const da = MathUtils.tileDistance(a.centroid, cameraPosition);
			const db = MathUtils.tileDistance(b.centroid, cameraPosition);
			return db - da;
		});
	}
}
