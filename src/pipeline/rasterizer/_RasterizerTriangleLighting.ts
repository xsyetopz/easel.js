import type { TriangleBuffer } from "../TriangleBuffer.ts";
import type { BaseColors, VertexColors } from "./_RasterizerTriangleColors.ts";
import type { RasterizerState, TextureData } from "./_RasterizerTypes.ts";

/** Draw-call inputs read while applying one triangle's lighting state. */
export interface TriangleLightingInputs {
  /** Mutable state that receives the triangle's depth, fog, and color setup. */
  state: RasterizerState;
  /** Projected triangle data containing depth and fog factors. */
  tb: TriangleBuffer;
  /** Baked lighting colors, or undefined when the triangle is unlit. */
  shadedColorData: Float32Array | undefined;
  /** Sampled texture data, which selects the textured tint paths. */
  texture: TextureData | undefined;
}

/** Per-triangle lighting mode and resolved colors produced before output. */
export interface TriangleLighting extends BaseColors {
  /** Index of the first triangle vertex in the packed triangle buffers. */
  vertexOffset: number;
  /** Offset of this triangle's lighting record in the packed color data. */
  base: number;
  /** Whether the triangle uses one flat lighting color. */
  isFlat: boolean;
  /** Whether the triangle uses per-vertex Gouraud lighting. */
  isGouraud: boolean;
  /** Vertex colors resolved for the triangle. */
  colors: VertexColors;
}

/** Copies depth, fog, and baked color values into active triangle state. */
export function applyTriangleState(
  inputs: TriangleLightingInputs,
  lighting: TriangleLighting,
): void {
  const { state, tb, shadedColorData } = inputs;
  const { vertexOffset } = lighting;
  state.ndcZ0 = tb.ndcZ[vertexOffset];
  state.ndcZ1 = tb.ndcZ[vertexOffset + 1];
  state.ndcZ2 = tb.ndcZ[vertexOffset + 2];
  if (state.hasFog) {
    state.fogF0 = tb.fogFactor[vertexOffset];
    state.fogF1 = tb.fogFactor[vertexOffset + 1];
    state.fogF2 = tb.fogFactor[vertexOffset + 2];
  }
  state.baseR = lighting.effectiveR;
  state.baseG = lighting.effectiveG;
  state.baseB = lighting.effectiveB;
  state.flatR = lighting.flatR;
  state.flatG = lighting.flatG;
  state.flatB = lighting.flatB;
  if (lighting.isGouraud && shadedColorData) {
    state.gouraudData = shadedColorData;
    state.gouraudBase = lighting.base;
  }
}

function setBrightnessVertexTint(
  inputs: TriangleLightingInputs,
  lighting: TriangleLighting,
): void {
  const { state, shadedColorData } = inputs;
  const { base } = lighting;
  const tint = state.vertexTintScratch;
  tint.set(lighting.colors.values);
  state.vertexTintData = tint;
  if (lighting.isGouraud && shadedColorData) return;

  const lightR = shadedColorData ? shadedColorData[base] : 1;
  const lightG = shadedColorData ? shadedColorData[base + 1] : 1;
  const lightB = shadedColorData ? shadedColorData[base + 2] : 1;
  const scratch = state.vertexColorScratch;
  for (let k = 0; k < 3; k++) {
    scratch[k * 3] = lightR;
    scratch[k * 3 + 1] = lightG;
    scratch[k * 3 + 2] = lightB;
  }
  state.gouraudData = scratch;
  state.gouraudBase = 0;
}

function setCombinedVertexTint(
  inputs: TriangleLightingInputs,
  lighting: TriangleLighting,
): void {
  const { state, shadedColorData } = inputs;
  const { isGouraud, isFlat, base } = lighting;
  const values = lighting.colors.values;
  const scratch = state.vertexColorScratch;
  for (let k = 0; k < 3; k++) {
    const lightBase = k * 3;
    let lightR = 1;
    let lightG = 1;
    let lightB = 1;
    if (isGouraud && shadedColorData) {
      lightR = shadedColorData[base + lightBase];
      lightG = shadedColorData[base + lightBase + 1];
      lightB = shadedColorData[base + lightBase + 2];
    } else if (isFlat && shadedColorData) {
      lightR = shadedColorData[base];
      lightG = shadedColorData[base + 1];
      lightB = shadedColorData[base + 2];
    }
    scratch[lightBase] = lightR * values[lightBase];
    scratch[lightBase + 1] = lightG * values[lightBase + 1];
    scratch[lightBase + 2] = lightB * values[lightBase + 2];
  }
  state.gouraudData = scratch;
  state.gouraudBase = 0;
}

/** Configures vertex-color tinting for combined lighting and texture paths. */
export function setMixedVertexTint(
  inputs: TriangleLightingInputs,
  lighting: TriangleLighting,
): void {
  const { state, texture } = inputs;
  const { colors, isFlat, isGouraud } = lighting;
  if (!(colors.hasVertexColor && colors.mixedVertexColor)) return;
  if (
    texture &&
    (isFlat || isGouraud) &&
    state.brightnessLevels !== undefined
  ) {
    setBrightnessVertexTint(inputs, lighting);
    return;
  }
  if (texture) state.hasCombinedTextureTint = true;
  setCombinedVertexTint(inputs, lighting);
}

/** Copies the triangle's three UV pairs into active rasterizer state. */
export function setTextureCoordinates(
  state: RasterizerState,
  tb: TriangleBuffer,
  vertexOffset: number,
): void {
  state.uv0u = tb.uvU[vertexOffset];
  state.uv0v = tb.uvV[vertexOffset];
  state.uv1u = tb.uvU[vertexOffset + 1];
  state.uv1v = tb.uvV[vertexOffset + 1];
  state.uv2u = tb.uvU[vertexOffset + 2];
  state.uv2v = tb.uvV[vertexOffset + 2];
}

function clampLight(value: number): number {
  return value < 0 ? 0 : Math.min(value, 1);
}

/** Selects flat-texture lighting and brightness-level sampling state. */
export function setFlatTextureState(
  inputs: TriangleLightingInputs,
  lighting: TriangleLighting,
): void {
  const { state, texture, shadedColorData } = inputs;
  const { isFlat, base, flatR, flatG, flatB } = lighting;
  if (!(isFlat && texture && !lighting.colors.mixedVertexColor)) {
    state.selectedBrightTex = undefined;
    return;
  }
  if (state.hasTextureColorTint && shadedColorData) {
    state.flatTextureLightR = clampLight(shadedColorData[base]);
    state.flatTextureLightG = clampLight(shadedColorData[base + 1]);
    state.flatTextureLightB = clampLight(shadedColorData[base + 2]);
  } else {
    state.flatTextureLightR = 1;
    state.flatTextureLightG = 1;
    state.flatTextureLightB = 1;
  }

  let litFactor: number;
  if (state.hasTextureColorTint) {
    litFactor = shadedColorData
      ? (shadedColorData[base] +
          shadedColorData[base + 1] +
          shadedColorData[base + 2]) *
        0.3333333333333333
      : 1;
  } else {
    litFactor = (flatR + flatG + flatB) * 0.00130718954248366;
  }
  state.flatLitFactor = litFactor;
  const brightnessLevels = state.brightnessLevels;
  if (!brightnessLevels) {
    state.selectedBrightTex = undefined;
    return;
  }
  const level = (litFactor * brightnessLevels.length + 0.5) | 0;
  const index = Math.max(0, Math.min(level, brightnessLevels.length - 1));
  state.selectedBrightTex = brightnessLevels[index];
}
