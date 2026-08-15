import type { TriangleBuffer } from "../TriangleBuffer.ts";
import { createScanlineCallback } from "./_RasterizerCallbacks.ts";
import { rasterizeTriangleOutput } from "./_RasterizerTriangleOutput.ts";
import { prepareTriangleState } from "./_RasterizerTriangleState.ts";
import type { RasterizerState, TextureData } from "./_RasterizerTypes.ts";
import type { ScanlineFill } from "./ScanlineFill.ts";
import type { WireframeRasterizer } from "./WireframeRasterizer.ts";

/** Inputs used to rasterize one projected triangle. */
export interface TriangleRasterizeOptions {
  /** Mutable state containing the active framebuffer and interpolation values. */
  state: RasterizerState;
  /** Scanline filler used for the triangle's interior. */
  scanlineFill: ScanlineFill;
  /** Rasterizer used when wireframe output is requested. */
  wireframeRasterizer: WireframeRasterizer;
  /** Projected triangle data containing screen coordinates and attributes. */
  tb: TriangleBuffer;
  /** Index of the triangle in the physical triangle buffer. */
  physIdx: number;
  /** Baked lighting colors, or undefined when no lighting data is present. */
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
  /** Sampled texture data for textured triangle output. */
  texture: TextureData | undefined;
  /** Whether to draw the triangle edges instead of a filled interior. */
  wireframe: boolean | undefined;
  /** Whether to draw the triangle vertices as points. */
  points: boolean | undefined;
  /** Radius, in pixels, used for point rendering. */
  pointRadius: number;
  /** Width of the destination framebuffer in pixels. */
  width: number;
  /** Height of the destination framebuffer in pixels. */
  height: number;
}

function triangleCoordinates(
  tb: TriangleBuffer,
  vertexOffset: number,
): readonly [number, number, number, number, number, number] {
  return [
    tb.screenX[vertexOffset],
    tb.screenY[vertexOffset],
    tb.screenX[vertexOffset + 1],
    tb.screenY[vertexOffset + 1],
    tb.screenX[vertexOffset + 2],
    tb.screenY[vertexOffset + 2],
  ];
}

/** Rasterizes a projected triangle using the selected fill and output paths. */
export function rasterizeTriangle(options: TriangleRasterizeOptions): void {
  const {
    state,
    scanlineFill,
    wireframeRasterizer,
    tb,
    physIdx,
    shadedColorData,
    shadedColorStride,
    iterIdx,
    baseR,
    baseG,
    baseB,
    texture,
    wireframe,
    points,
    pointRadius,
    width,
    height,
  } = options;
  const vertexOffset = physIdx * 3;
  const shading = prepareTriangleState({
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
  });
  const callback = createScanlineCallback(
    state,
    shading.isGouraud || shading.mixedVertexColor,
    shading.isFlat && !shading.mixedVertexColor,
    Boolean(texture),
  );
  rasterizeTriangleOutput({
    state,
    scanlineFill,
    wireframeRasterizer,
    shading,
    coordinates: triangleCoordinates(tb, vertexOffset),
    width,
    height,
    wireframe,
    points,
    pointRadius,
    callback,
  });
}
