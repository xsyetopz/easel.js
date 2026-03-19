import { accumulateLights } from "./lightAccumulator.js";

/** @type {{ r: number, g: number, b: number }} */
const _out = { r: 0, g: 0, b: 0 };

export class GouraudShader {
	/**
	 * Computes Gouraud-shaded RGB light contribution for a vertex.
	 * @param {number} nx Normalized vertex normal X component
	 * @param {number} ny Normalized vertex normal Y component
	 * @param {number} nz Normalized vertex normal Z component
	 * @param {Array<*>} lights
	 * @param {number} [ambientIntensity=0.1]
	 * @returns {{ r: number, g: number, b: number }} RGB multipliers in [0, 1]
	 */
	shade(nx, ny, nz, lights, ambientIntensity = 0.1) {
		return accumulateLights(nx, ny, nz, lights, ambientIntensity, _out);
	}
}
