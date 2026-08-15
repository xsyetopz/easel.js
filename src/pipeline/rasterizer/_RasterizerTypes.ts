import type { Wrapping as WrappingMode } from "../../core/Constants.ts";
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

/** RGBA texel data and dimensions consumed by the CPU texture path. */
export interface TextureData {
  /** Clamped RGBA bytes arranged in row-major texel order. */
  data: Uint8ClampedArray;
  /** Texture width in texels. */
  width: number;
  /** Texture height in texels. */
  height: number;
}

/** Texture data and optional sampling or brightness lookup settings. */
export interface MaterialMap {
  /** Source texel data sampled during rasterization. */
  data: TextureData;
  /** Precomputed brightness-specific texel planes, when available. */
  brightnessLevels?: Uint8ClampedArray[];
  /** Horizontal texture addressing mode. */
  wrapS?: WrappingMode;
  /** Vertical texture addressing mode. */
  wrapT?: WrappingMode;
}

/** CPU rasterization options derived from a scene material. */
export interface RasterMaterial {
  /** Whether triangle edges are rasterized instead of triangle interiors. */
  wireframe?: boolean;
  /** Whether triangle vertices are rasterized as points. */
  points?: boolean;
  /** Point diameter in framebuffer pixels. */
  size?: number;
  /** Line width in framebuffer pixels. */
  linewidth?: number;
  /** Length of each visible dashed-line segment in pixels. */
  dashSize?: number;
  /** Length of each gap between dashed-line segments in pixels. */
  gapSize?: number;
  /** Base RGB color multiplied into rasterized fragments. */
  color?: { r: number; g: number; b: number };
  /** Optional texture sampled for rasterized fragments. */
  map?: MaterialMap;
  /** Discrete opacity value used by the blend path. */
  opacity?: number;
  /** Whether fragments use sorted translucent blending. */
  transparent?: boolean;
  /** Whether fragments are compared with the CPU depth buffer. */
  depthTest?: boolean;
  /** Whether passing fragments update the CPU depth buffer. */
  depthWrite?: boolean;
}

/** Geometry, material, and color data for one rasterizer submission. */
export interface RasterDrawCall {
  /** Primitive family selected by the rasterizer dispatch. */
  primitive?: "triangles" | "lines";
  /** Triangle vertex and attribute data for triangle rasterization. */
  triangles?: TriangleBuffer;
  /** Line vertex and attribute data for line rasterization. */
  lines?: LineBuffer;
  /** Material options applied to the submitted primitive. */
  material: RasterMaterial;
  /** Baked per-vertex lighting colors stored as packed float data. */
  shadedColorData?: Float32Array;
  /** Number of float entries occupied by one shaded color record. */
  shadedColorStride?: number;
  /** Optional per-vertex RGB color data. */
  vertexColorData?: ArrayLike<number>;
  /** Number of color components stored for each vertex. */
  vertexColorItemSize?: number;
  /** Red component of the per-instance color multiplier. */
  instanceColorR?: number;
  /** Green component of the per-instance color multiplier. */
  instanceColorG?: number;
  /** Blue component of the per-instance color multiplier. */
  instanceColorB?: number;
}

/** CPU framebuffer views required by the rasterizers. */
export interface RasterFramebuffer {
  /** Framebuffer width in pixels. */
  width: number;
  /** Framebuffer height in pixels. */
  height: number;
  /** Depth storage used for CPU depth testing and writes. */
  depthBuffer: DepthBuffer;
  /** Packed 32-bit RGBA framebuffer view. */
  u32: Uint32Array;
}

/** Function invoked for each horizontal scanline covered by a primitive. */
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
  /** Depth-buffer object associated with the current framebuffer. */
  depthBuf: DepthBuffer;
  /** Uint16 depth values used for per-pixel depth tests. */
  dbData: Uint16Array;
  /** Width of the depth-buffer rows. */
  dbWidth: number;
  /** Normalized device-space depth at the first triangle vertex. */
  ndcZ0: number;
  /** Normalized device-space depth at the second triangle vertex. */
  ndcZ1: number;
  /** Normalized device-space depth at the third triangle vertex. */
  ndcZ2: number;
  /** Flat-lit red channel before texture and fog application. */
  flatR: number;
  /** Flat-lit green channel before texture and fog application. */
  flatG: number;
  /** Flat-lit blue channel before texture and fog application. */
  flatB: number;
  /** Interpolated Gouraud color data for the current triangle, if present. */
  gouraudData: Float32Array | undefined;
  /** Starting offset of the current triangle's Gouraud colors. */
  gouraudBase: number;
  /** Per-vertex color data for the current triangle, if present. */
  vertexColorData: ArrayLike<number> | undefined;
  /** Number of color components stored for each vertex. */
  vertexColorItemSize: number;
  /** Per-vertex texture tint data, if present. */
  vertexTintData: Float32Array | undefined;
  /** Scratch RGB buffer reused for vertex color calculations. */
  vertexColorScratch: Float32Array;
  /** Scratch RGB buffer reused for vertex tint calculations. */
  vertexTintScratch: Float32Array;
  /** Whether the texture supplies a color tint for the current path. */
  hasTextureColorTint: boolean;
  /** Whether texture and vertex tints are combined for the current path. */
  hasCombinedTextureTint: boolean;
  /** Red component of the texture color tint. */
  textureColorR: number;
  /** Green component of the texture color tint. */
  textureColorG: number;
  /** Blue component of the texture color tint. */
  textureColorB: number;
  /** Red component of the texture material multiplier. */
  textureMaterialR: number;
  /** Green component of the texture material multiplier. */
  textureMaterialG: number;
  /** Blue component of the texture material multiplier. */
  textureMaterialB: number;
  /** Base red channel used for untextured fragment output. */
  baseR: number;
  /** Base green channel used for untextured fragment output. */
  baseG: number;
  /** Base blue channel used for untextured fragment output. */
  baseB: number;
  /** Current texture's RGBA bytes, if a texture is active. */
  texData: Uint8ClampedArray | undefined;
  /** Current texture width in texels. */
  texW: number;
  /** Current texture height in texels. */
  texH: number;
  /** First triangle vertex horizontal texture coordinate. */
  uv0u: number;
  /** First triangle vertex vertical texture coordinate. */
  uv0v: number;
  /** Second triangle vertex horizontal texture coordinate. */
  uv1u: number;
  /** Second triangle vertex vertical texture coordinate. */
  uv1v: number;
  /** Third triangle vertex horizontal texture coordinate. */
  uv2u: number;
  /** Third triangle vertex vertical texture coordinate. */
  uv2v: number;
  /** Packed 32-bit framebuffer view receiving rasterized pixels. */
  fbU32: Uint32Array;
  /** Whether fog factors should be applied to the current triangle. */
  hasFog: boolean;
  /** Red component of the fog color. */
  fogR: number;
  /** Green component of the fog color. */
  fogG: number;
  /** Blue component of the fog color. */
  fogB: number;
  /** Fog interpolation factor at the first triangle vertex. */
  fogF0: number;
  /** Fog interpolation factor at the second triangle vertex. */
  fogF1: number;
  /** Fog interpolation factor at the third triangle vertex. */
  fogF2: number;
  /** Brightness-specific texture planes, when available. */
  brightnessLevels: Uint8ClampedArray[] | undefined;
  /** Brightness plane selected for the current triangle. */
  selectedBrightTex: Uint8ClampedArray | undefined;
  /** Lighting factor for flat-shaded fragments. */
  flatLitFactor: number;
  /** Red component of flat texture lighting. */
  flatTextureLightR: number;
  /** Green component of flat texture lighting. */
  flatTextureLightG: number;
  /** Blue component of flat texture lighting. */
  flatTextureLightB: number;
  /** Horizontal texture addressing mode for the current material. */
  wrapS: WrappingMode;
  /** Vertical texture addressing mode for the current material. */
  wrapT: WrappingMode;
  /** Discrete fragment opacity used for blending. */
  opacity: number;
  /** Source contribution factor used by the blend path. */
  srcWeight: number;
  /** Whether the current fragments are alpha-blended. */
  blend: boolean;
  /** Whether the current fragments perform depth comparisons. */
  depthTest: boolean;
  /** Whether passing fragments write to the depth buffer. */
  depthWrite: boolean;
}

/** State for point rasterization, limited to depth and framebuffer access. */
export interface PointRasterState {
  /** Uint16 depth values used for per-pixel depth tests. */
  dbData: Uint16Array;
  /** Width of the depth-buffer rows. */
  dbWidth: number;
  /** Packed 32-bit framebuffer view receiving point pixels. */
  fbU32: Uint32Array;
  /** Whether point fragments perform depth comparisons. */
  depthTest: boolean;
  /** Whether passing point fragments write to the depth buffer. */
  depthWrite: boolean;
  /** Whether point fragments are alpha-blended. */
  blend: boolean;
  /** Source contribution factor used by point blending. */
  srcWeight: number;
}
