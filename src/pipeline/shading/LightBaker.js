import { Shading } from "../../core/Constants.js";
import { FlatShader } from "./FlatShader.js";
import { GouraudShader } from "./GouraudShader.js";

/** Bakes scene lights into per-vertex or per-face colors. */
export class LightBaker {
	#flatShader = new FlatShader();
	#gouraudShader = new GouraudShader();

	/**
	 * Bakes lighting onto a draw call's faces or vertices.
	 * Writes shaded RGB into drawCall.shadedColorData (flat Float32Array).
	 * Stride is 3 for flat shading (r,g,b per face) or 9 for gouraud (r,g,b × 3 vertices).
	 * @param {{ triangles: *, material: { shading?: number }, shadedColorData: Float32Array, shadedColorStride: number }} drawCall
	 * @param {Array<Record<string, unknown>>} lights
	 * @returns {void}
	 */
	bake(drawCall, lights) {
		drawCall.shadedColorStride = 0;
		if (lights.length === 0) return;

		const tb = drawCall.triangles;
		const isFlat = drawCall.material.shading === Shading.Flat;
		const stride = isFlat ? 3 : 9;
		const needed = tb.length * stride;

		if (drawCall.shadedColorData.length < needed) {
			drawCall.shadedColorData = new Float32Array(needed);
		}
		drawCall.shadedColorStride = stride;

		for (let i = 0; i < tb.length; i++) {
			const physIdx = tb.sortOrder[i];
			const base = i * stride;

			if (isFlat) {
				const v = physIdx * 3;
				// Face centroid world position: average of the 3 vertex world positions.
				const fcwx = (tb.worldX[v] + tb.worldX[v + 1] + tb.worldX[v + 2]) / 3;
				const fcwy = (tb.worldY[v] + tb.worldY[v + 1] + tb.worldY[v + 2]) / 3;
				const fcwz = (tb.worldZ[v] + tb.worldZ[v + 1] + tb.worldZ[v + 2]) / 3;
				const s = this.#flatShader.shade(
					tb.faceNormalX[physIdx],
					tb.faceNormalY[physIdx],
					tb.faceNormalZ[physIdx],
					lights,
					0.1,
					fcwx,
					fcwy,
					fcwz,
				);
				drawCall.shadedColorData[base] = s.r;
				drawCall.shadedColorData[base + 1] = s.g;
				drawCall.shadedColorData[base + 2] = s.b;
			} else {
				const v = physIdx * 3;
				const v0 = this.#gouraudShader.shade(
					tb.vertNormalX[v],
					tb.vertNormalY[v],
					tb.vertNormalZ[v],
					lights,
					0.1,
					tb.worldX[v],
					tb.worldY[v],
					tb.worldZ[v],
				);
				drawCall.shadedColorData[base] = v0.r;
				drawCall.shadedColorData[base + 1] = v0.g;
				drawCall.shadedColorData[base + 2] = v0.b;

				const v1 = this.#gouraudShader.shade(
					tb.vertNormalX[v + 1],
					tb.vertNormalY[v + 1],
					tb.vertNormalZ[v + 1],
					lights,
					0.1,
					tb.worldX[v + 1],
					tb.worldY[v + 1],
					tb.worldZ[v + 1],
				);
				drawCall.shadedColorData[base + 3] = v1.r;
				drawCall.shadedColorData[base + 4] = v1.g;
				drawCall.shadedColorData[base + 5] = v1.b;

				const v2 = this.#gouraudShader.shade(
					tb.vertNormalX[v + 2],
					tb.vertNormalY[v + 2],
					tb.vertNormalZ[v + 2],
					lights,
					0.1,
					tb.worldX[v + 2],
					tb.worldY[v + 2],
					tb.worldZ[v + 2],
				);
				drawCall.shadedColorData[base + 6] = v2.r;
				drawCall.shadedColorData[base + 7] = v2.g;
				drawCall.shadedColorData[base + 8] = v2.b;
			}
		}
	}
}
