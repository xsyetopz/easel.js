import { MathUtils } from "../../math/MathUtils.ts";

/** Clamps UV coordinates to texture bounds. */
export class TextureClamp {
	/** Clamps UV coordinates to [0, 1] and converts to integer texel coordinates. */
	clamp(
		u: number,
		v: number,
		texWidth: number,
		texHeight: number,
	): { x: number; y: number } {
		const cu = MathUtils.clamp(u, 0, 1);
		const cv = MathUtils.clamp(v, 0, 1);
		return {
			x: MathUtils.fastTrunc(cu * (texWidth - 1)),
			y: MathUtils.fastTrunc(cv * (texHeight - 1)),
		};
	}
}
