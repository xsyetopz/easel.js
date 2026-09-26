import {
  rasterizeTriangleOutput,
  type TriangleOutputOptions,
} from "./_RasterizerTriangleOutput.ts";
import {
  prepareTriangleState,
  type TriangleShading,
  type TriangleStateOptions,
} from "./_RasterizerTriangleState.ts";
import type { RasterizerState } from "./_RasterizerTypes.ts";

/**
 * Inputs used to rasterize one projected triangle. A rasterizer keeps one
 * instance, sets its draw-call fields once, and changes only the triangle
 * indices per triangle.
 */
export interface TriangleRasterizeOptions
  extends TriangleStateOptions,
    TriangleOutputOptions {
  /** Reused record that receives the triangle's prepared shading. */
  shading: TriangleShading;
}

function clampChannel(value: number): number {
  return value < 0 ? 0 : Math.min(Math.round(value), 255);
}

/**
 * Bakes the triangle's lit color and average fog factor into its flat output
 * color so wireframe edges match the filled triangle without per-pixel work.
 */
function applyWireframeShading(
  state: RasterizerState,
  shading: TriangleShading,
): void {
  const light = state.gouraudData;
  if ((shading.isGouraud || shading.mixedVertexColor) && light) {
    const tint = state.vertexTintData;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let vertex = 0; vertex < 9; vertex += 3) {
      const at = state.gouraudBase + vertex;
      r += light[at] * (tint ? tint[vertex] : 1);
      g += light[at + 1] * (tint ? tint[vertex + 1] : 1);
      b += light[at + 2] * (tint ? tint[vertex + 2] : 1);
    }
    shading.flatR = clampChannel((state.baseR * r) / 3);
    shading.flatG = clampChannel((state.baseG * g) / 3);
    shading.flatB = clampChannel((state.baseB * b) / 3);
  }
  if (!state.hasFog) return;
  const fog = (state.fogF0 + state.fogF1 + state.fogF2) / 3;
  const f = fog < 0 ? 0 : Math.min(fog, 1);
  shading.flatR = clampChannel(
    shading.flatR + (state.fogR - shading.flatR) * f,
  );
  shading.flatG = clampChannel(
    shading.flatG + (state.fogG - shading.flatG) * f,
  );
  shading.flatB = clampChannel(
    shading.flatB + (state.fogB - shading.flatB) * f,
  );
}

/** Rasterizes a projected triangle using the selected fill and output paths. */
export function rasterizeTriangle(options: TriangleRasterizeOptions): void {
  const shading = prepareTriangleState(options, options.shading);
  if (options.wireframe) applyWireframeShading(options.state, shading);
  rasterizeTriangleOutput(options, shading);
}
