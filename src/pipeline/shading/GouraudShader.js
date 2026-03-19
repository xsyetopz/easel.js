import { accumulateLights } from "./lightAccumulator.js";

export class GouraudShader {
	/**
	 * Computes Gouraud-shaded RGB light contribution for a vertex.
	 * @param {{ x: number, y: number, z: number }} vertexNormal Normalized vertex normal
	 * @param {Array<*>} lights
	 * @param {number} [ambientIntensity=0.1]
	 * @returns {{ r: number, g: number, b: number }} RGB multipliers in [0, 1]
	 */
	shade(vertexNormal, lights, ambientIntensity = 0.1) {
		return accumulateLights(vertexNormal, lights, ambientIntensity);
	}
}
