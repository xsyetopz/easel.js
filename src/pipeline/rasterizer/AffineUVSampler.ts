/** Affine (non-perspective-correct) UV texture coordinate interpolator. */
export class AffineUVSampler {
  /**
   * Interpolates UV coordinates linearly along a scanline.
   * @param u1 U at start of scanline
   * @param v1 V at start of scanline
   * @param u2 U at end of scanline
   * @param v2 V at end of scanline
   * @param t Position along scanline in [0, 1]
   */
  sample(
    u1: number,
    v1: number,
    u2: number,
    v2: number,
    t: number,
  ): { u: number; v: number } {
    return {
      u: u1 + (u2 - u1) * t,
      v: v1 + (v2 - v1) * t,
    };
  }
}
