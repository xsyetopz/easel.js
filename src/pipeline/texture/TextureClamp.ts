import { clamp, fastTrunc } from "../../math/MathUtils.ts";

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
    const cu = clamp(u, 0, 1);
    const cv = clamp(v, 0, 1);
    return {
      x: Math.min(texWidth - 1, fastTrunc(cu * texWidth)),
      y: Math.min(texHeight - 1, fastTrunc(cv * texHeight)),
    };
  }
}
