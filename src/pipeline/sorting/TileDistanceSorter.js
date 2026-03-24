/** Sorts draw calls by tile distance from camera. */
export class TileDistanceSorter {
	/** @type {Map<*, number>} Reusable map to avoid per-frame allocation. */
	#distMap = new Map();

	/**
	 * Sorts draw calls back-to-front by Manhattan tile distance from camera.
	 * @param {*} drawList
	 * @param {{ x: number, y: number }} cameraPosition
	 * @returns {void}
	 */
	sort(drawList, cameraPosition) {
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
			(/** @type {*} */ a, /** @type {*} */ b) =>
				/** @type {number} */ (dm.get(b)) -
				/** @type {number} */ (dm.get(a)),
		);
	}
}
