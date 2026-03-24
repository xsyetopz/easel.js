import { Vector3 } from "../../math/Vector3.ts";

interface ViewCamera {
	matrixWorldInverse: { elements: ArrayLike<number> };
}

/** Transforms world-space coordinates into camera view space. */
export class WorldToView {
	/** Transforms an array of world-space Vector3 positions into view space. */
	transform(
		positions: Vector3[],
		camera: ViewCamera,
		output: Vector3[],
	): Vector3[] {
		for (let i = 0; i < positions.length; i++) {
			if (!output[i]) output[i] = new Vector3();
			output[i].copy(positions[i]).applyMatrix4(camera.matrixWorldInverse);
		}
		return output;
	}

	/** Transforms a single world-space point into view space. */
	transformPoint(point: Vector3, camera: ViewCamera, target: Vector3): Vector3 {
		return target.copy(point).applyMatrix4(camera.matrixWorldInverse);
	}
}
