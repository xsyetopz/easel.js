import type { TriangleBuffer } from "../TriangleBuffer.ts";
import {
  configureBaseColors,
  createVertexColors,
  resolveVertexColors,
  type VertexColors,
} from "./_RasterizerTriangleColors.ts";
import {
  applyTriangleState,
  setFlatTextureState,
  setMixedVertexTint,
  setTextureCoordinates,
  type TriangleLighting,
} from "./_RasterizerTriangleLighting.ts";
import type { RasterizerState, TextureData } from "./_RasterizerTypes.ts";

/** Inputs required to prepare the rasterizer state for one triangle. */
export interface TriangleStateOptions {
  /** Mutable state that receives the triangle's interpolants and color setup. */
  state: RasterizerState;
  /** Projected triangle data containing coordinates, depth, UVs, and colors. */
  tb: TriangleBuffer;
  /** Index of the triangle in the physical triangle buffer. */
  physIdx: number;
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

/**
 * Color and lighting mode selected while preparing a triangle. One instance is
 * reused for every triangle a rasterizer draws.
 */
export interface TriangleShading extends TriangleLighting {
  /** Whether vertex colors require a mixed tint path. */
  mixedVertexColor: boolean;
  /** Vertex-color storage reused by {@link resolveVertexColors}. */
  colorScratch: VertexColors;
}

/** Creates the reusable per-rasterizer triangle shading record. */
export function createTriangleShading(): TriangleShading {
  const colorScratch = createVertexColors();
  return {
    vertexOffset: 0,
    base: 0,
    isFlat: false,
    isGouraud: false,
    mixedVertexColor: false,
    colors: colorScratch,
    colorScratch,
    effectiveR: 0,
    effectiveG: 0,
    effectiveB: 0,
    flatR: 0,
    flatG: 0,
    flatB: 0,
  };
}

/**
 * Prepares interpolants, lighting, vertex colors, and texture state for a
 * triangle, writing its shading mode and flat color into `shading`.
 */
export function prepareTriangleState(
  options: TriangleStateOptions,
  shading: TriangleShading,
): TriangleShading {
  const { state, tb, physIdx, shadedColorStride, iterIdx, texture } = options;
  const vertexOffset = physIdx * 3;
  const isFlat = shadedColorStride === 3;
  const base = iterIdx * shadedColorStride;
  shading.vertexOffset = vertexOffset;
  shading.isFlat = isFlat;
  shading.isGouraud = shadedColorStride === 9;
  shading.base = base;
  const colors = resolveVertexColors(
    state,
    tb,
    vertexOffset,
    shading.colorScratch,
  );
  shading.colors = colors;
  shading.mixedVertexColor = colors.mixedVertexColor;
  configureBaseColors(options, colors, base, isFlat, shading);
  applyTriangleState(options, shading);
  setMixedVertexTint(options, shading);
  if (texture) setTextureCoordinates(state, tb, vertexOffset);
  setFlatTextureState(options, shading);
  return shading;
}
