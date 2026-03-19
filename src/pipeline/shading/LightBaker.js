import { Shading } from "../../core/Constants.js";
import { FlatShader } from "./FlatShader.js";
import { GouraudShader } from "./GouraudShader.js";

export class LightBaker {
	#flatShader = new FlatShader();
	#gouraudShader = new GouraudShader();

	/**
	 * Bakes lighting onto a draw call's faces or vertices.
	 * Stores shaded RGB colors on drawCall.shadedColors, indexed by sorted iteration position.
	 * @param {{ triangles: import('../TriangleBuffer.js').TriangleBuffer, material: { shading?: number }, shadedColors: Array<*> }} drawCall
	 * @param {Array<Record<string, unknown>>} lights
	 * @returns {void}
	 */
	bake(drawCall, lights) {
		if (drawCall.shadedColors) drawCall.shadedColors.length = 0;
		else drawCall.shadedColors = [];
		if (lights.length === 0) return;

		const tb = drawCall.triangles;
		for (let i = 0; i < tb.length; i++) {
			const physIdx = tb.sortOrder[i];

			if (drawCall.material.shading === Shading.Flat) {
				const s = this.#flatShader.shade(
					tb.faceNormalX[physIdx],
					tb.faceNormalY[physIdx],
					tb.faceNormalZ[physIdx],
					lights,
				);
				drawCall.shadedColors[i] = { r: s.r, g: s.g, b: s.b };
			} else {
				const v = physIdx * 3;
				const v0 = this.#gouraudShader.shade(
					tb.vertNormalX[v],
					tb.vertNormalY[v],
					tb.vertNormalZ[v],
					lights,
				);
				const c0 = { r: v0.r, g: v0.g, b: v0.b };
				const v1 = this.#gouraudShader.shade(
					tb.vertNormalX[v + 1],
					tb.vertNormalY[v + 1],
					tb.vertNormalZ[v + 1],
					lights,
				);
				const c1 = { r: v1.r, g: v1.g, b: v1.b };
				const v2 = this.#gouraudShader.shade(
					tb.vertNormalX[v + 2],
					tb.vertNormalY[v + 2],
					tb.vertNormalZ[v + 2],
					lights,
				);
				const c2 = { r: v2.r, g: v2.g, b: v2.b };
				drawCall.shadedColors[i] = [c0, c1, c2];
			}
		}
	}
}
