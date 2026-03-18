import { MathUtils } from "../../math/MathUtils.js";

export class GouraudShader {
	/**
	 * Computes a Gouraud-shaded HSL16 color for a vertex given its normal and scene lights.
	 * @param {{ x: number, y: number, z: number }} vertexNormal Normalized vertex normal
	 * @param {Array<{ direction: { x: number, y: number, z: number }, color: number, intensity: number }>} lights
	 * @param {number} [ambientIntensity=0.1]
	 * @returns {number} HSL16-encoded color
	 */
	shade(vertexNormal, lights, ambientIntensity = 0.1) {
		let intensity = ambientIntensity;

		for (const light of lights) {
			const d = light.direction;
			const dot =
				vertexNormal.x * -d.x + vertexNormal.y * -d.y + vertexNormal.z * -d.z;
			if (dot > 0) intensity += dot * light.intensity;
		}

		const l = MathUtils.clamp(intensity, 0, 1);
		return MathUtils.packHsl16(0, 0, l);
	}
}
