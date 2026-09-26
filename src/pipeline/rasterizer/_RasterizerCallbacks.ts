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

/** Scanline fillers bound once to one rasterizer's mutable state. */
export interface ScanlineCallbacks {
  /** Mutable state every callback reads. */
  state: RasterizerState;
  /** Flat-colored fill. */
  flat: ScanlineCallback;
  /** Gouraud-interpolated fill. */
  gouraud: ScanlineCallback;
  /** Flat-lit textured fill. */
  flatTex: ScanlineCallback;
  /** Unlit textured fill. */
  unlitTex: ScanlineCallback;
  /** Gouraud textured fill with a uniform vertex-color tint. */
  gouraudTexUniformTint: ScanlineCallback;
  /** Gouraud textured fill with material and vertex tints combined. */
  gouraudTexCombinedTint: ScanlineCallback;
  /** Gouraud textured fill with per-vertex tint data. */
  gouraudTexVertexTint: ScanlineCallback;
  /** Gouraud textured fill without tint. */
  gouraudTexNoTint: ScanlineCallback;
}

/** Binds every scanline filler to `state` once, for reuse across triangles. */
export function createScanlineCallbacks(
  state: RasterizerState,
): ScanlineCallbacks {
  return {
    state,
    flat: fillFlat.bind(undefined, state),
    gouraud: fillGouraud.bind(undefined, state),
    flatTex: fillFlatTex.bind(undefined, state),
    unlitTex: fillUnlitTex.bind(undefined, state),
    gouraudTexUniformTint: fillGouraudTexUniformTint.bind(undefined, state),
    gouraudTexCombinedTint: fillGouraudTexCombinedTint.bind(undefined, state),
    gouraudTexVertexTint: fillGouraudTexVertexTint.bind(undefined, state),
    gouraudTexNoTint: fillGouraudTexNoTint.bind(undefined, state),
  };
}

/** Selects the pre-bound scanline filler for the active triangle shading mode. */
export function selectScanlineCallback(
  callbacks: ScanlineCallbacks,
  isGouraud: boolean,
  isFlat: boolean,
  hasTexture: boolean,
): ScanlineCallback {
  const state = callbacks.state;
  if (hasTexture) {
    if (isGouraud) {
      if (state.hasTextureColorTint) return callbacks.gouraudTexUniformTint;
      if (state.hasCombinedTextureTint) return callbacks.gouraudTexCombinedTint;
      if (state.vertexTintData !== undefined) {
        return callbacks.gouraudTexVertexTint;
      }
      return callbacks.gouraudTexNoTint;
    }
    if (isFlat) return callbacks.flatTex;
    return callbacks.unlitTex;
  }
  if (isGouraud) return callbacks.gouraud;
  return callbacks.flat;
}
