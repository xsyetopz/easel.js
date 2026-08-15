import type { TriangleBuffer } from "../TriangleBuffer.ts";
import type { RasterizerState, TextureData } from "./_RasterizerTypes.ts";

/** Per-triangle vertex RGB data and whether its colors vary across vertices. */
export interface VertexColors {
  /** Whether valid RGB vertex attributes were found for the triangle. */
  hasVertexColor: boolean;
  /** Whether the three vertices do not share one uniform RGB color. */
  mixedVertexColor: boolean;
  /** Clamped RGB values for vertices 0, 1, and 2 in that order. */
  values: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
}

/** Material RGB values after applying vertex colors and flat lighting. */
export interface BaseColors {
  /** Material RGB values after applying a uniform vertex color. */
  effectiveR: number;
  /** Material green value after applying a uniform vertex color. */
  effectiveG: number;
  /** Material blue value after applying a uniform vertex color. */
  effectiveB: number;
  /** Red value used for flat-shaded triangle output. */
  flatR: number;
  /** Green value used for flat-shaded triangle output. */
  flatG: number;
  /** Blue value used for flat-shaded triangle output. */
  flatB: number;
}

interface BaseColorOptions {
  state: RasterizerState;
  colors: VertexColors;
  shadedColorData: Float32Array | undefined;
  base: number;
  baseR: number;
  baseG: number;
  baseB: number;
  texture: TextureData | undefined;
  isFlat: boolean;
}

const DEFAULT_VERTEX_COLORS: VertexColors = {
  hasVertexColor: false,
  mixedVertexColor: false,
  values: [1, 1, 1, 1, 1, 1, 1, 1, 1],
};

function clampVertexColor(value: number): number {
  return value < 0 ? 0 : Math.min(value, 1);
}

/**
 * Reads and clamps the three RGB vertex colors for one triangle.
 * Returns neutral colors when the attribute data is unavailable or invalid.
 */
export function resolveVertexColors(
  state: RasterizerState,
  tb: TriangleBuffer,
  vertexOffset: number,
): VertexColors {
  const vertexColors = state.vertexColorData;
  if (!vertexColors || state.vertexColorItemSize !== 3) {
    return DEFAULT_VERTEX_COLORS;
  }

  const c0 = tb.vertexIndex[vertexOffset] * 3;
  const c1 = tb.vertexIndex[vertexOffset + 1] * 3;
  const c2 = tb.vertexIndex[vertexOffset + 2] * 3;
  if (
    c0 < 0 ||
    c1 < 0 ||
    c2 < 0 ||
    c0 + 2 >= vertexColors.length ||
    c1 + 2 >= vertexColors.length ||
    c2 + 2 >= vertexColors.length
  ) {
    return DEFAULT_VERTEX_COLORS;
  }

  const values: VertexColors["values"] = [
    clampVertexColor(vertexColors[c0]),
    clampVertexColor(vertexColors[c0 + 1]),
    clampVertexColor(vertexColors[c0 + 2]),
    clampVertexColor(vertexColors[c1]),
    clampVertexColor(vertexColors[c1 + 1]),
    clampVertexColor(vertexColors[c1 + 2]),
    clampVertexColor(vertexColors[c2]),
    clampVertexColor(vertexColors[c2 + 1]),
    clampVertexColor(vertexColors[c2 + 2]),
  ];
  const mixedVertexColor =
    values[0] !== values[3] ||
    values[1] !== values[4] ||
    values[2] !== values[5] ||
    values[0] !== values[6] ||
    values[1] !== values[7] ||
    values[2] !== values[8];
  return { hasVertexColor: true, mixedVertexColor, values };
}

function applyUniformVertexColor(options: {
  state: RasterizerState;
  colors: VertexColors;
  texture: TextureData | undefined;
  baseR: number;
  baseG: number;
  baseB: number;
}): [number, number, number] {
  const { state, colors, texture, baseR, baseG, baseB } = options;
  if (!(colors.hasVertexColor && !colors.mixedVertexColor)) {
    return [baseR, baseG, baseB];
  }
  const effectiveR = Math.round(baseR * colors.values[0]);
  const effectiveG = Math.round(baseG * colors.values[1]);
  const effectiveB = Math.round(baseB * colors.values[2]);
  if (texture) {
    state.hasTextureColorTint = true;
    state.textureColorR = effectiveR / 255;
    state.textureColorG = effectiveG / 255;
    state.textureColorB = effectiveB / 255;
  }
  return [effectiveR, effectiveG, effectiveB];
}

function applyMixedVertexColor(options: {
  colors: VertexColors;
  baseR: number;
  baseG: number;
  baseB: number;
  effective: [number, number, number];
}): [number, number, number] {
  const { colors, baseR, baseG, baseB, effective } = options;
  if (!(colors.hasVertexColor && colors.mixedVertexColor)) return effective;
  return [
    Math.round(
      (baseR * (colors.values[0] + colors.values[3] + colors.values[6])) / 3,
    ),
    Math.round(
      (baseG * (colors.values[1] + colors.values[4] + colors.values[7])) / 3,
    ),
    Math.round(
      (baseB * (colors.values[2] + colors.values[5] + colors.values[8])) / 3,
    ),
  ];
}

/**
 * Applies vertex colors and optional baked flat lighting to material RGB values.
 * Also resets the texture tint state used by subsequent scanline fills.
 */
export function configureBaseColors(options: BaseColorOptions): BaseColors {
  const {
    state,
    colors,
    shadedColorData,
    base,
    baseR,
    baseG,
    baseB,
    texture,
    isFlat,
  } = options;
  state.vertexTintData = undefined;
  state.hasTextureColorTint = false;
  state.hasCombinedTextureTint = false;
  state.textureColorR = 1;
  state.textureColorG = 1;
  state.textureColorB = 1;
  state.textureMaterialR = baseR / 255;
  state.textureMaterialG = baseG / 255;
  state.textureMaterialB = baseB / 255;
  const [effectiveR, effectiveG, effectiveB] = applyUniformVertexColor({
    state,
    colors,
    texture,
    baseR,
    baseG,
    baseB,
  });
  let [flatR, flatG, flatB] = applyMixedVertexColor({
    colors,
    baseR,
    baseG,
    baseB,
    effective: [effectiveR, effectiveG, effectiveB],
  });
  if (isFlat && shadedColorData) {
    flatR = Math.round(effectiveR * shadedColorData[base]);
    flatG = Math.round(effectiveG * shadedColorData[base + 1]);
    flatB = Math.round(effectiveB * shadedColorData[base + 2]);
  }
  return { effectiveR, effectiveG, effectiveB, flatR, flatG, flatB };
}
