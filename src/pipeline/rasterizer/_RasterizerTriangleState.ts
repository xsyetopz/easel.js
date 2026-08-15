import type { TriangleBuffer } from "../TriangleBuffer.ts";
import {
  configureBaseColors,
  resolveVertexColors,
} from "./_RasterizerTriangleColors.ts";
import {
  applyTriangleState,
  setFlatTextureState,
  setMixedVertexTint,
  setTextureCoordinates,
} from "./_RasterizerTriangleLighting.ts";
import type { RasterizerState, TextureData } from "./_RasterizerTypes.ts";

/** Inputs required to prepare the rasterizer state for one triangle. */
export interface TriangleStateOptions {
  /** Mutable state that receives the triangle's interpolants and color setup. */
  state: RasterizerState;
  /** Projected triangle data containing coordinates, depth, UVs, and colors. */
  tb: TriangleBuffer;
  /** Index of the first triangle vertex in the packed triangle buffers. */
  vertexOffset: number;
  /** Baked lighting colors, or undefined when the triangle is unlit. */
  shadedColorData: Float32Array | undefined;
  /** Number of lighting values stored per triangle in shadedColorData. */
  shadedColorStride: number;
  /** Triangle index used to locate its lighting values. */
  iterIdx: number;
  /** Base material and instance red channel in the 0–255 range. */
  baseR: number;
  /** Base material and instance green channel in the 0–255 range. */
  baseG: number;
  /** Base material and instance blue channel in the 0–255 range. */
  baseB: number;
  /** Sampled texture data used to configure UV and texture tint state. */
  texture: TextureData | undefined;
}

/** Color and lighting mode selected while preparing a triangle. */
export interface TriangleShading {
  /** Whether the triangle uses one flat lighting color. */
  isFlat: boolean;
  /** Whether the triangle uses per-vertex Gouraud lighting. */
  isGouraud: boolean;
  /** Offset of this triangle's lighting record in the packed color data. */
  base: number;
  /** Whether vertex colors require a mixed tint path. */
  mixedVertexColor: boolean;
  /** Flat red channel after material and lighting setup. */
  flatR: number;
  /** Flat green channel after material and lighting setup. */
  flatG: number;
  /** Flat blue channel after material and lighting setup. */
  flatB: number;
}

function applyTriangleShading(options: {
  state: RasterizerState;
  tb: TriangleBuffer;
  vertexOffset: number;
  shadedColorData: Float32Array | undefined;
  base: number;
  baseColors: ReturnType<typeof configureBaseColors>;
  colors: ReturnType<typeof resolveVertexColors>;
  isFlat: boolean;
  isGouraud: boolean;
  texture: TextureData | undefined;
}): void {
  const {
    state,
    tb,
    vertexOffset,
    shadedColorData,
    base,
    baseColors,
    colors,
    isFlat,
    isGouraud,
    texture,
  } = options;
  applyTriangleState({
    state,
    tb,
    vertexOffset,
    shadedColorData,
    base,
    baseColors,
    isGouraud,
  });
  setMixedVertexTint({
    state,
    colors,
    texture,
    isFlat,
    isGouraud,
    shadedColorData,
    base,
  });
  if (texture) setTextureCoordinates(state, tb, vertexOffset);
  setFlatTextureState({
    state,
    isFlat,
    texture,
    mixedVertexColor: colors.mixedVertexColor,
    shadedColorData,
    base,
    flatR: baseColors.flatR,
    flatG: baseColors.flatG,
    flatB: baseColors.flatB,
  });
}

/** Prepares interpolants, lighting, vertex colors, and texture state for a triangle. */
export function prepareTriangleState(
  options: TriangleStateOptions,
): TriangleShading {
  const {
    state,
    tb,
    vertexOffset,
    shadedColorData,
    shadedColorStride,
    iterIdx,
    baseR,
    baseG,
    baseB,
    texture,
  } = options;
  const isFlat = shadedColorStride === 3;
  const isGouraud = shadedColorStride === 9;
  const base = iterIdx * shadedColorStride;
  const colors = resolveVertexColors(state, tb, vertexOffset);
  const baseColors = configureBaseColors({
    state,
    colors,
    shadedColorData,
    base,
    baseR,
    baseG,
    baseB,
    texture,
    isFlat,
  });
  applyTriangleShading({
    state,
    tb,
    vertexOffset,
    shadedColorData,
    base,
    baseColors,
    colors,
    isFlat,
    isGouraud,
    texture,
  });
  return {
    isFlat,
    isGouraud,
    base,
    mixedVertexColor: colors.mixedVertexColor,
    flatR: baseColors.flatR,
    flatG: baseColors.flatG,
    flatB: baseColors.flatB,
  };
}
