/** Culls objects beyond the tile-radius fog distance. */
export class FogCuller {
	/**
	 * Removes draw calls beyond the fog far distance from the draw list.
	 * If no fog is provided the draw list is returned unchanged.
	 * @param {import('./DrawList.js').DrawList} drawList
	 * @param {import('../scenes/Fog.js').Fog|undefined} fog
	 * @param {{ x: number, y: number, z: number }} cameraPosition
	 * @returns {import('./DrawList.js').DrawList}
	 */
	cull(drawList, fog, cameraPosition) {
		if (!fog) return drawList;

		const farSq = fog.far * fog.far;
		const cx = cameraPosition.x;
		const cy = cameraPosition.y;
		const cz = cameraPosition.z;

		const kept = drawList.calls.filter((call) => {
			const dx = call.centroid.x - cx;
			const dy = call.centroid.y - cy;
			const dz = call.centroid.z - cz;
			return dx * dx + dy * dy + dz * dz <= farSq;
		});
		drawList.calls.length = 0;
		for (const call of kept) drawList.calls.push(call);
		return drawList;
	}
}
