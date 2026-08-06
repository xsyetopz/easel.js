import { type Wrapping as WrappingMode } from "../../core/Constants.ts";
import type { DepthBuffer } from "../framebuffer/DepthBuffer.ts";
import type { LineBuffer } from "../LineBuffer.ts";
import type { TriangleBuffer } from "../TriangleBuffer.ts";

/**
 * 4x4 Bayer ordered dither thresholds, normalized to [0, 1).
 * Indexed as BAYER4[(y & 3) << 2 | (x & 3)].
 */
export const BAYER4 = Float64Array.of(
  0 / 16,
  8 / 16,
  2 / 16,
  10 / 16,
  12 / 16,
  4 / 16,
  14 / 16,
  6 / 16,
  3 / 16,
  11 / 16,
  1 / 16,
  9 / 16,
  15 / 16,
  7 / 16,
  13 / 16,
  5 / 16,
);

export interface TextureData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface MaterialMap {
  data: TextureData;
  brightnessLevels?: Uint8ClampedArray[];
  wrapS?: WrappingMode;
  wrapT?: WrappingMode;
}

export interface RasterMaterial {
  wireframe?: boolean;
  points?: boolean;
  size?: number;
  linewidth?: number;
  dashSize?: number;
  gapSize?: number;
  color?: { r: number; g: number; b: number };
  map?: MaterialMap;
  opacity?: number;
  transparent?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
}

export interface RasterDrawCall {
  primitive?: "triangles" | "lines";
  triangles?: TriangleBuffer;
  lines?: LineBuffer;
  material: RasterMaterial;
  shadedColorData?: Float32Array;
  shadedColorStride?: number;
  vertexColorData?: ArrayLike<number>;
  vertexColorItemSize?: number;
  instanceColorR?: number;
  instanceColorG?: number;
  instanceColorB?: number;
}

export interface RasterFramebuffer {
  width: number;
  height: number;
  depthBuffer: DepthBuffer;
  u32: Uint32Array;
}

export type ScanlineCallback = (
  y: number,
  xStart: number,
  xEnd: number,
  u: number,
  v: number,
  duDx: number,
  dvDx: number,
) => void;

/**
 * Per-triangle state passed to scanline fill functions.
 * Set once per triangle by Rasterizer, read in fill handlers.
 */
export interface RasterizerState {
  depthBuf: DepthBuffer;
  dbData: Uint16Array;
  dbWidth: number;
  ndcZ0: number;
  ndcZ1: number;
  ndcZ2: number;
  flatR: number;
  flatG: number;
  flatB: number;
  gouraudData: Float32Array | undefined;
  gouraudBase: number;
  vertexColorData: ArrayLike<number> | undefined;
  vertexColorItemSize: number;
  vertexTintData: Float32Array | undefined;
  vertexColorScratch: Float32Array;
  vertexTintScratch: Float32Array;
  hasTextureColorTint: boolean;
  hasCombinedTextureTint: boolean;
  textureColorR: number;
  textureColorG: number;
  textureColorB: number;
  textureMaterialR: number;
  textureMaterialG: number;
  textureMaterialB: number;
  baseR: number;
  baseG: number;
  baseB: number;
  texData: Uint8ClampedArray | undefined;
  texW: number;
  texH: number;
  uv0u: number;
  uv0v: number;
  uv1u: number;
  uv1v: number;
  uv2u: number;
  uv2v: number;
  fbU32: Uint32Array;
  hasFog: boolean;
  fogR: number;
  fogG: number;
  fogB: number;
  fogF0: number;
  fogF1: number;
  fogF2: number;
  brightnessLevels: Uint8ClampedArray[] | undefined;
  selectedBrightTex: Uint8ClampedArray | undefined;
  flatLitFactor: number;
  flatTextureLightR: number;
  flatTextureLightG: number;
  flatTextureLightB: number;
  wrapS: WrappingMode;
  wrapT: WrappingMode;
  opacity: number;
  srcWeight: number;
  blend: boolean;
  depthTest: boolean;
  depthWrite: boolean;
}

/**
 * State for point rasterization (depth buffer + framebuffer only).
 */
export interface PointRasterState {
  dbData: Uint16Array;
  dbWidth: number;
  fbU32: Uint32Array;
  depthTest: boolean;
  depthWrite: boolean;
  blend: boolean;
  srcWeight: number;
}
