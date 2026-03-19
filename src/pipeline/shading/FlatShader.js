import { accumulateLights } from "./lightAccumulator.js";

export class FlatShader {
	/**
	 * Computes flat-shaded RGB light contribution for a face.
	 * @param {{ x: number, y: number, z: number }} faceNormal Normalized face normal
	 * @param {Array<*>} lights
	 * @param {number} [ambientIntensity=0.1]
	 * @returns {{ r: number, g: number, b: number }} RGB multipliers in [0, 1]
	 */
	shade(faceNormal, lights, ambientIntensity = 0.1) {
		return accumulateLights(faceNormal, lights, ambientIntensity);
	}
}
