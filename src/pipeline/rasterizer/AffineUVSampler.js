/** Affine (non-perspective-correct) UV texture coordinate interpolator. */
export class AffineUVSampler {
	/**
	 * Interpolates UV coordinates linearly along a scanline.
	 * @param {number} u1 U at start of scanline
	 * @param {number} v1 V at start of scanline
	 * @param {number} u2 U at end of scanline
	 * @param {number} v2 V at end of scanline
	 * @param {number} t Position along scanline in [0, 1]
	 * @returns {{ u: number, v: number }}
	 */
	sample(u1, v1, u2, v2, t) {
		return {
			u: u1 + (u2 - u1) * t,
			v: v1 + (v2 - v1) * t,
		};
	}
}
