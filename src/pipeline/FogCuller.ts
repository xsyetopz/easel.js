import type { DrawCall } from "./DrawCall.ts";

interface FogLike {
	far: number;
}

interface CullableDrawList {
	calls: DrawCall[];
}

/** Culls objects beyond the tile-radius fog distance. */
export class FogCuller {
	/**
	 * Removes draw calls beyond the fog far distance from the draw list.
	 * If no fog is provided the draw list is returned unchanged.
	 */
	cull(
		drawList: CullableDrawList,
		fog: FogLike | undefined,
		cameraPosition: { x: number; y: number; z: number },
	): CullableDrawList {
		if (!fog) return drawList;

		const farSq = fog.far * fog.far;
		const cx = cameraPosition.x;
		const cy = cameraPosition.y;
		const cz = cameraPosition.z;

		const calls = drawList.calls;
		let write = 0;
		for (const call of calls) {
			const dx = call.centroid.x - cx;
			const dy = call.centroid.y - cy;
			const dz = call.centroid.z - cz;
			if (dx * dx + dy * dy + dz * dz <= farSq) {
				calls[write] = call;
				write++;
			}
		}
		calls.length = write;
		return drawList;
	}
}
