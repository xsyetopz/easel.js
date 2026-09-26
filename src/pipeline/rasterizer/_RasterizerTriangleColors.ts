import { encodeSrgb } from "../color/SrgbEncode.ts";
import type { TriangleBuffer } from "../TriangleBuffer.ts";
import type { RasterizerState, TextureData } from "./_RasterizerTypes.ts";

/** Per-triangle vertex RGB data and whether its colors vary across vertices. */
export interface VertexColors {
  /** Whether valid RGB vertex attributes were found for the triangle. */
  hasVertexColor: boolean;
  /** Whether the three vertices do not share one uniform RGB color. */
  mixedVertexColor: boolean;
  /** sRGB-encoded RGB values for vertices 0, 1, and 2 in that order. */
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

/** Draw-call inputs read while configuring a triangle's base colors. */
export interface BaseColorInputs {
  /** Mutable state whose texture tint fields are reset for the triangle. */
  state: RasterizerState;
  /** Baked lighting colors, or undefined when the triangle is unlit. */
  shadedColorData: Float32Array | undefined;
  /** Base material and instance red channel in the 0–255 range. */
  baseR: number;
  /** Base material and instance green channel in the 0–255 range. */
  baseG: number;
  /** Base material and instance blue channel in the 0–255 range. */
  baseB: number;
  /** Sampled texture data, which enables the uniform texture tint. */
  texture: TextureData | undefined;
}

const DEFAULT_VERTEX_COLORS: VertexColors = {
  hasVertexColor: false,
  mixedVertexColor: false,
  values: [1, 1, 1, 1, 1, 1, 1, 1, 1],
};

/** Creates reusable vertex-color storage for {@link resolveVertexColors}. */
export function createVertexColors(): VertexColors {
  return {
    hasVertexColor: false,
    mixedVertexColor: false,
    values: [1, 1, 1, 1, 1, 1, 1, 1, 1],
  };
}

/**
 * Reads the three linear RGB vertex colors for one triangle and writes their
 * clamped sRGB encodings into `out`, so they multiply sRGB material, light,
 * and texel values.
 * Returns shared neutral colors when the attribute data is unavailable or
 * invalid, so the result must be read before the next call reuses `out`.
 */
export function resolveVertexColors(
  state: RasterizerState,
  tb: TriangleBuffer,
  vertexOffset: number,
  out: VertexColors,
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

  const values = out.values;
  values[0] = encodeSrgb(vertexColors[c0]);
  values[1] = encodeSrgb(vertexColors[c0 + 1]);
  values[2] = encodeSrgb(vertexColors[c0 + 2]);
  values[3] = encodeSrgb(vertexColors[c1]);
  values[4] = encodeSrgb(vertexColors[c1 + 1]);
  values[5] = encodeSrgb(vertexColors[c1 + 2]);
  values[6] = encodeSrgb(vertexColors[c2]);
  values[7] = encodeSrgb(vertexColors[c2 + 1]);
  values[8] = encodeSrgb(vertexColors[c2 + 2]);
  out.hasVertexColor = true;
  out.mixedVertexColor =
    values[0] !== values[3] ||
    values[1] !== values[4] ||
    values[2] !== values[5] ||
    values[0] !== values[6] ||
    values[1] !== values[7] ||
    values[2] !== values[8];
  return out;
}

/**
 * Applies vertex colors and optional baked flat lighting to material RGB
 * values, writing the results into `out`.
 * Also resets the texture tint state used by subsequent scanline fills.
 */
export function configureBaseColors(
  inputs: BaseColorInputs,
  colors: VertexColors,
  base: number,
  isFlat: boolean,
  out: BaseColors,
): void {
  const { state, shadedColorData, baseR, baseG, baseB, texture } = inputs;
  state.vertexTintData = undefined;
  state.hasTextureColorTint = false;
  state.hasCombinedTextureTint = false;
  state.textureColorR = 1;
  state.textureColorG = 1;
  state.textureColorB = 1;
  state.textureMaterialR = baseR / 255;
  state.textureMaterialG = baseG / 255;
  state.textureMaterialB = baseB / 255;
  let effectiveR = baseR;
  let effectiveG = baseG;
  let effectiveB = baseB;
  let flatR = baseR;
  let flatG = baseG;
  let flatB = baseB;
  if (colors.hasVertexColor) {
    const values = colors.values;
    if (colors.mixedVertexColor) {
      flatR = Math.round((baseR * (values[0] + values[3] + values[6])) / 3);
      flatG = Math.round((baseG * (values[1] + values[4] + values[7])) / 3);
      flatB = Math.round((baseB * (values[2] + values[5] + values[8])) / 3);
    } else {
      effectiveR = Math.round(baseR * values[0]);
      effectiveG = Math.round(baseG * values[1]);
      effectiveB = Math.round(baseB * values[2]);
      flatR = effectiveR;
      flatG = effectiveG;
      flatB = effectiveB;
      if (texture) {
        state.hasTextureColorTint = true;
        state.textureColorR = effectiveR / 255;
        state.textureColorG = effectiveG / 255;
        state.textureColorB = effectiveB / 255;
      }
    }
  }
  if (isFlat && shadedColorData) {
    flatR = Math.round(effectiveR * shadedColorData[base]);
    flatG = Math.round(effectiveG * shadedColorData[base + 1]);
    flatB = Math.round(effectiveB * shadedColorData[base + 2]);
  }
  out.effectiveR = effectiveR;
  out.effectiveG = effectiveG;
  out.effectiveB = effectiveB;
  out.flatR = flatR;
  out.flatG = flatG;
  out.flatB = flatB;
}
