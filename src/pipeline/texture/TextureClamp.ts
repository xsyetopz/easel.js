import { MathUtils } from "../../math/MathUtils.ts";

/** Clamps UV coordinates to texture bounds. */
export class TextureClamp {
  /**
   * Clamps UV coordinates to [0, 1] and maps each coordinate to its texel cell.
   * The final cell is included when the UV reaches 1.
   */
  clamp(
    u: number,
    v: number,
    texWidth: number,
    texHeight: number,
  ): { x: number; y: number } {
    const cu = MathUtils.clamp(u, 0, 1);
    const cv = MathUtils.clamp(v, 0, 1);
    return {
      x: Math.min(texWidth - 1, MathUtils.fastTrunc(cu * texWidth)),
      y: Math.min(texHeight - 1, MathUtils.fastTrunc(cv * texHeight)),
    };
  }
}
