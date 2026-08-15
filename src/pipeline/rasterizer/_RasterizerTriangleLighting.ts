import type { TriangleBuffer } from "../TriangleBuffer.ts";
import type { BaseColors, VertexColors } from "./_RasterizerTriangleColors.ts";
import type { RasterizerState, TextureData } from "./_RasterizerTypes.ts";

/** Copies depth, fog, and baked color values into active triangle state. */
export function applyTriangleState(options: {
  state: RasterizerState;
  tb: TriangleBuffer;
  vertexOffset: number;
  shadedColorData: Float32Array | undefined;
  base: number;
  baseColors: BaseColors;
  isGouraud: boolean;
}): void {
  const {
    state,
    tb,
    vertexOffset,
    shadedColorData,
    base,
    baseColors,
    isGouraud,
  } = options;
  state.ndcZ0 = tb.ndcZ[vertexOffset];
  state.ndcZ1 = tb.ndcZ[vertexOffset + 1];
  state.ndcZ2 = tb.ndcZ[vertexOffset + 2];
  if (state.hasFog) {
    state.fogF0 = tb.fogFactor[vertexOffset];
    state.fogF1 = tb.fogFactor[vertexOffset + 1];
    state.fogF2 = tb.fogFactor[vertexOffset + 2];
  }
  state.baseR = baseColors.effectiveR;
  state.baseG = baseColors.effectiveG;
  state.baseB = baseColors.effectiveB;
  state.flatR = baseColors.flatR;
  state.flatG = baseColors.flatG;
  state.flatB = baseColors.flatB;
  if (isGouraud && shadedColorData) {
    state.gouraudData = shadedColorData;
    state.gouraudBase = base;
  }
}

function setBrightnessVertexTint(options: {
  state: RasterizerState;
  colors: VertexColors;
  isGouraud: boolean;
  shadedColorData: Float32Array | undefined;
  base: number;
}): void {
  const { state, colors, isGouraud, shadedColorData, base } = options;
  const tint = state.vertexTintScratch;
  tint.set(colors.values);
  state.vertexTintData = tint;
  if (isGouraud && shadedColorData) return;

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

function setCombinedVertexTint(options: {
  state: RasterizerState;
  colors: VertexColors;
  isGouraud: boolean;
  isFlat: boolean;
  shadedColorData: Float32Array | undefined;
  base: number;
}): void {
  const { state, colors, isGouraud, isFlat, shadedColorData, base } = options;
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
    scratch[lightBase] = lightR * colors.values[lightBase];
    scratch[lightBase + 1] = lightG * colors.values[lightBase + 1];
    scratch[lightBase + 2] = lightB * colors.values[lightBase + 2];
  }
  state.gouraudData = scratch;
  state.gouraudBase = 0;
}

/** Configures vertex-color tinting for combined lighting and texture paths. */
export function setMixedVertexTint(options: {
  state: RasterizerState;
  colors: VertexColors;
  texture: TextureData | undefined;
  isFlat: boolean;
  isGouraud: boolean;
  shadedColorData: Float32Array | undefined;
  base: number;
}): void {
  const { state, colors, texture, isFlat, isGouraud } = options;
  if (!(colors.hasVertexColor && colors.mixedVertexColor)) return;
  if (
    texture &&
    (isFlat || isGouraud) &&
    state.brightnessLevels !== undefined
  ) {
    setBrightnessVertexTint(options);
    return;
  }
  if (texture) state.hasCombinedTextureTint = true;
  setCombinedVertexTint(options);
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
export function setFlatTextureState(options: {
  state: RasterizerState;
  isFlat: boolean;
  texture: TextureData | undefined;
  mixedVertexColor: boolean;
  shadedColorData: Float32Array | undefined;
  base: number;
  flatR: number;
  flatG: number;
  flatB: number;
}): void {
  const {
    state,
    isFlat,
    texture,
    mixedVertexColor,
    shadedColorData,
    base,
    flatR,
    flatG,
    flatB,
  } = options;
  if (!(isFlat && texture && !mixedVertexColor)) {
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
