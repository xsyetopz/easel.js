import { Vector3 } from "../../math/Vector3.js";

/** Transforms world-space coordinates into camera view space. */
export class WorldToView {
	/**
	 * Transforms an array of world-space Vector3 positions into view space.
	 * @param {Vector3[]} positions
	 * @param {{ matrixWorldInverse: import('../../math/Matrix4.js').Matrix4 }} camera
	 * @param {Vector3[]} output Output array (populated in place)
	 * @returns {Vector3[]}
	 */
	transform(positions, camera, output) {
		for (let i = 0; i < positions.length; i++) {
			if (!output[i]) output[i] = new Vector3();
			output[i].copy(positions[i]).applyMatrix4(camera.matrixWorldInverse);
		}
		return output;
	}

	/**
	 * Transforms a single world-space point into view space.
	 * @param {Vector3} point
	 * @param {{ matrixWorldInverse: import('../../math/Matrix4.js').Matrix4 }} camera
	 * @param {Vector3} target
	 * @returns {Vector3}
	 */
	transformPoint(point, camera, target) {
		return target.copy(point).applyMatrix4(camera.matrixWorldInverse);
	}
}
