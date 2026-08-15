import type { RasterizerState, ScanlineCallback } from "./_RasterizerTypes.ts";
import {
  fillFlat,
  fillFlatTex,
  fillGouraud,
  fillUnlitTex,
} from "./_ScanlineFillersBasic.ts";
import {
  fillGouraudTexCombinedTint,
  fillGouraudTexNoTint,
  fillGouraudTexUniformTint,
  fillGouraudTexVertexTint,
} from "./_ScanlineFillersGouraudTex.ts";

/** Selects and binds the scanline filler for the active triangle shading mode. */
export function createScanlineCallback(
  state: RasterizerState,
  isGouraud: boolean,
  isFlat: boolean,
  hasTexture: boolean,
): ScanlineCallback {
  if (hasTexture) {
    if (isGouraud) {
      if (state.hasTextureColorTint) {
        return fillGouraudTexUniformTint.bind(undefined, state);
      }
      if (state.hasCombinedTextureTint) {
        return fillGouraudTexCombinedTint.bind(undefined, state);
      }
      if (state.vertexTintData !== undefined) {
        return fillGouraudTexVertexTint.bind(undefined, state);
      }
      return fillGouraudTexNoTint.bind(undefined, state);
    }
    if (isFlat) return fillFlatTex.bind(undefined, state);
    return fillUnlitTex.bind(undefined, state);
  }
  if (isGouraud) return fillGouraud.bind(undefined, state);
  return fillFlat.bind(undefined, state);
}
