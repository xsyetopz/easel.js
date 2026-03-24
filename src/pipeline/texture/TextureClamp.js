import { MathUtils } from "../../math/MathUtils.ts";

/** Clamps UV coordinates to texture bounds. */
export class TextureClamp {
	/**
	 * Clamps UV coordinates to [0, 1] and converts to integer texel coordinates.
	 * @param {number} u U coordinate
	 * @param {number} v V coordinate
	 * @param {number} texWidth Texture width in pixels
	 * @param {number} texHeight Texture height in pixels
	 * @returns {{ x: number, y: number }}
	 */
	clamp(u, v, texWidth, texHeight) {
		const cu = MathUtils.clamp(u, 0, 1);
		const cv = MathUtils.clamp(v, 0, 1);
		return {
			x: MathUtils.fastTrunc(cu * (texWidth - 1)),
			y: MathUtils.fastTrunc(cv * (texHeight - 1)),
		};
	}
}
