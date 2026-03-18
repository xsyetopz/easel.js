import { MathUtils } from "../math/MathUtils.js";

export class FogCuller {
	/**
	 * Removes draw calls beyond the fog tile radius from the draw list.
	 * If no fog is provided the draw list is returned unchanged.
	 * @param {import('./DrawList.js').DrawList} drawList
	 * @param {import('../scenes/Fog.js').Fog|null|undefined} fog
	 * @param {{ x: number, y: number }} cameraPosition
	 * @returns {import('./DrawList.js').DrawList}
	 */
	cull(drawList, fog, cameraPosition) {
		if (!fog) return drawList;

		const maxTiles = fog.tiles;
		const kept = drawList.calls.filter(
			(call) =>
				MathUtils.tileDistance(call.centroid, cameraPosition) <= maxTiles,
		);
		drawList.calls.length = 0;
		for (const call of kept) drawList.calls.push(call);
		return drawList;
	}
}
