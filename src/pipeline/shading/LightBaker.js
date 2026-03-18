import { Shading } from "../../core/Constants.js";
import { FlatShader } from "./FlatShader.js";
import { GouraudShader } from "./GouraudShader.js";

export class LightBaker {
	#flatShader = new FlatShader();
	#gouraudShader = new GouraudShader();

	/**
	 * Bakes lighting onto a draw call's faces or vertices.
	 * Stores shaded HSL16 colors on drawCall.shadedColors.
	 * @param {{ triangles: Array<{ normal: { x: number, y: number, z: number }, vertices: Array<{ normal: { x: number, y: number, z: number } }> }>, material: { shading?: number }, shadedColors: Array<*> }} drawCall
	 * @param {Array<{ direction: { x: number, y: number, z: number }, color: import('../../math/Color.js').Color | number, intensity: number }>} lights
	 * @returns {void}
	 */
	bake(drawCall, lights) {
		drawCall.shadedColors = [];
		if (lights.length === 0) return;

		for (let i = 0; i < drawCall.triangles.length; i++) {
			const tri = drawCall.triangles[i];

			if (drawCall.material.shading === Shading.Flat) {
				drawCall.shadedColors[i] = this.#flatShader.shade(tri.normal, lights);
			} else {
				drawCall.shadedColors[i] = tri.vertices.map((v) =>
					this.#gouraudShader.shade(v.normal, lights),
				);
			}
		}
	}
}
