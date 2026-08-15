import { rasterizePoint, writePoint } from "./_RasterizerPoint.ts";
import type { TriangleShading } from "./_RasterizerTriangleState.ts";
import type { RasterizerState, ScanlineCallback } from "./_RasterizerTypes.ts";
import type { ScanlineFill } from "./ScanlineFill.ts";
import type { WireframeRasterizer } from "./WireframeRasterizer.ts";

/** Inputs required to select and execute one projected triangle output path. */
export interface TriangleOutputOptions {
  /** Mutable per-triangle state used for depth tests, blending, and framebuffer writes. */
  state: RasterizerState;
  /** Scanline filler used to rasterize the triangle interior when no alternate output mode is selected. */
  scanlineFill: ScanlineFill;
  /** Edge rasterizer used when wireframe output is selected. */
  wireframeRasterizer: WireframeRasterizer;
  /** Resolved lighting mode and flat output color for the triangle. */
  shading: TriangleShading;
  /** Projected screen-space coordinates in vertex order as x/y pairs for all three vertices. */
  coordinates: readonly [number, number, number, number, number, number];
  /** Destination framebuffer width in pixels, used to clip wireframe and point output. */
  width: number;
  /** Destination framebuffer height in pixels, used to clip wireframe and point output. */
  height: number;
  /** When true, rasterize the triangle's three edges instead of its interior. */
  wireframe: boolean | undefined;
  /** When true and wireframe is false, rasterize the triangle's three vertices as points. */
  points: boolean | undefined;
  /** Radius in framebuffer pixels for each point when point output is selected. */
  pointRadius: number;
  /** Scanline callback receiving barycentric coordinates and horizontal deltas for filled output. */
  callback: ScanlineCallback;
}

function packColor(shading: TriangleShading): number {
  return (
    0xff000000 | (shading.flatB << 16) | (shading.flatG << 8) | shading.flatR
  );
}

function rasterizeWireframe(
  options: TriangleOutputOptions,
  packed: number,
): void {
  const {
    state,
    wireframeRasterizer,
    coordinates: [x1, y1, x2, y2, x3, y3],
    width,
    height,
  } = options;
  const depth16 =
    (((state.ndcZ0 + state.ndcZ1 + state.ndcZ2) / 3 + 1) * 32767.5 + 0.5) | 0;
  wireframeRasterizer.rasterize(
    x1,
    y1,
    x2,
    y2,
    x3,
    y3,
    (px, py) => writePoint(state, px, py, depth16, packed),
    width,
    height,
  );
}

function rasterizePoints(options: TriangleOutputOptions, packed: number): void {
  const {
    state,
    coordinates: [x1, y1, x2, y2, x3, y3],
    width,
    height,
    pointRadius,
  } = options;
  const z1 = ((state.ndcZ0 + 1) * 32767.5 + 0.5) | 0;
  const z2 = ((state.ndcZ1 + 1) * 32767.5 + 0.5) | 0;
  const z3 = ((state.ndcZ2 + 1) * 32767.5 + 0.5) | 0;
  rasterizePoint(state, x1, y1, pointRadius, width, height, z1, packed);
  rasterizePoint(state, x2, y2, pointRadius, width, height, z2, packed);
  rasterizePoint(state, x3, y3, pointRadius, width, height, z3, packed);
}

/**
 * Routes one projected triangle to wireframe, point, or filled scanline output.
 *
 * Wireframe mode takes precedence over point mode. The selected path packs the
 * resolved flat shading color and applies the active depth and blending state
 * while writing to the CPU framebuffer or invoking the filled-output callback.
 *
 * @param options Projected triangle coordinates, rasterization collaborators,
 * shading state, and output-mode settings.
 */
export function rasterizeTriangleOutput(options: TriangleOutputOptions): void {
  const { wireframe, points } = options;
  const packed = packColor(options.shading);
  if (wireframe) {
    rasterizeWireframe(options, packed);
  } else if (points) {
    rasterizePoints(options, packed);
  } else {
    const {
      scanlineFill,
      coordinates: [x1, y1, x2, y2, x3, y3],
      width,
      height,
      callback,
    } = options;
    scanlineFill.fill(x1, y1, x2, y2, x3, y3, width, height, callback);
  }
}
