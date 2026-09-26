import type { TriangleBuffer } from "../TriangleBuffer.ts";
import {
  type ScanlineCallbacks,
  selectScanlineCallback,
} from "./_RasterizerCallbacks.ts";
import { rasterizePoint, writePoint } from "./_RasterizerPoint.ts";
import type { TriangleShading } from "./_RasterizerTriangleState.ts";
import type {
  PointRasterState,
  RasterizerState,
  TextureData,
} from "./_RasterizerTypes.ts";
import type { ScanlineFill } from "./ScanlineFill.ts";
import type { WireframeRasterizer } from "./WireframeRasterizer.ts";

/** Reusable wireframe pixel writer whose depth and color change per triangle. */
export interface WireframePlotter {
  /** Quantized depth written for the current triangle's edges. */
  depth16: number;
  /** Packed color written for the current triangle's edges. */
  packed: number;
  /** Writes one edge pixel with the current depth and color. */
  plot: (px: number, py: number) => void;
}

/** Creates a wireframe plotter bound once to one rasterizer's state. */
export function createWireframePlotter(
  state: PointRasterState,
): WireframePlotter {
  const plotter: WireframePlotter = {
    depth16: 0,
    packed: 0,
    plot: (px, py) =>
      writePoint(state, px, py, plotter.depth16, plotter.packed),
  };
  return plotter;
}

/** Inputs required to select and execute one projected triangle output path. */
export interface TriangleOutputOptions {
  /** Mutable per-triangle state used for depth tests, blending, and framebuffer writes. */
  state: RasterizerState;
  /** Scanline filler used to rasterize the triangle interior when no alternate output mode is selected. */
  scanlineFill: ScanlineFill;
  /** Edge rasterizer used when wireframe output is selected. */
  wireframeRasterizer: WireframeRasterizer;
  /** Scanline fillers pre-bound to `state`, selected per triangle for filled output. */
  scanlineCallbacks: ScanlineCallbacks;
  /** Reusable edge-pixel writer used when wireframe output is selected. */
  wireframePlotter: WireframePlotter;
  /** Projected triangle data containing the screen-space vertex coordinates. */
  tb: TriangleBuffer;
  /** Sampled texture data; selects a textured scanline filler when present. */
  texture: TextureData | undefined;
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
}

function packColor(shading: TriangleShading): number {
  return (
    0xff000000 | (shading.flatB << 16) | (shading.flatG << 8) | shading.flatR
  );
}

function rasterizeWireframe(
  options: TriangleOutputOptions,
  shading: TriangleShading,
  packed: number,
): void {
  const { state, wireframeRasterizer, wireframePlotter, tb, width, height } =
    options;
  const at = shading.vertexOffset;
  const screenX = tb.screenX;
  const screenY = tb.screenY;
  wireframePlotter.depth16 =
    (((state.ndcZ0 + state.ndcZ1 + state.ndcZ2) / 3 + 1) * 32767.5 + 0.5) | 0;
  wireframePlotter.packed = packed;
  wireframeRasterizer.rasterize(
    screenX[at],
    screenY[at],
    screenX[at + 1],
    screenY[at + 1],
    screenX[at + 2],
    screenY[at + 2],
    wireframePlotter.plot,
    width,
    height,
  );
}

function channel(value: number): number {
  const rounded = Math.round(value);
  return rounded < 0 ? 0 : Math.min(rounded, 255);
}

function packFoggedPoint(
  state: RasterizerState,
  point: number,
  r: number,
  g: number,
  b: number,
): number {
  const fog =
    point === 0 ? state.fogF0 : point === 1 ? state.fogF1 : state.fogF2;
  const f = fog < 0 ? 0 : Math.min(fog, 1);
  return (
    0xff000000 |
    (channel(b + (state.fogB - b) * f) << 16) |
    (channel(g + (state.fogG - g) * f) << 8) |
    channel(r + (state.fogR - r) * f)
  );
}

// Each point in a padded point triangle keeps its own vertex color instead of
// the triangle's averaged flat color, and blends toward the fog color by its
// own fog factor. Mixed vertex tint state holds the per-vertex light and color
// factors for the current triangle.
function packPointColor(
  state: RasterizerState,
  shading: TriangleShading,
  point: number,
  packed: number,
): number {
  const light = state.gouraudData;
  if (!(shading.mixedVertexColor && light)) {
    if (!state.hasFog) return packed;
    return packFoggedPoint(
      state,
      point,
      shading.flatR,
      shading.flatG,
      shading.flatB,
    );
  }
  const at = state.gouraudBase + point * 3;
  const tint = state.vertexTintData;
  const t = point * 3;
  const r = state.baseR * light[at] * (tint ? tint[t] : 1);
  const g = state.baseG * light[at + 1] * (tint ? tint[t + 1] : 1);
  const b = state.baseB * light[at + 2] * (tint ? tint[t + 2] : 1);
  if (state.hasFog) return packFoggedPoint(state, point, r, g, b);
  return 0xff000000 | (channel(b) << 16) | (channel(g) << 8) | channel(r);
}

function rasterizePoints(
  options: TriangleOutputOptions,
  shading: TriangleShading,
  packed: number,
): void {
  const { state, tb, width, height, pointRadius } = options;
  const at = shading.vertexOffset;
  const screenX = tb.screenX;
  const screenY = tb.screenY;
  const z1 = ((state.ndcZ0 + 1) * 32767.5 + 0.5) | 0;
  const z2 = ((state.ndcZ1 + 1) * 32767.5 + 0.5) | 0;
  const z3 = ((state.ndcZ2 + 1) * 32767.5 + 0.5) | 0;
  const c1 = packPointColor(state, shading, 0, packed);
  const c2 = packPointColor(state, shading, 1, packed);
  const c3 = packPointColor(state, shading, 2, packed);
  rasterizePoint(
    state,
    screenX[at],
    screenY[at],
    pointRadius,
    width,
    height,
    z1,
    c1,
  );
  rasterizePoint(
    state,
    screenX[at + 1],
    screenY[at + 1],
    pointRadius,
    width,
    height,
    z2,
    c2,
  );
  rasterizePoint(
    state,
    screenX[at + 2],
    screenY[at + 2],
    pointRadius,
    width,
    height,
    z3,
    c3,
  );
}

/**
 * Routes one projected triangle to wireframe, point, or filled scanline output.
 *
 * Wireframe mode takes precedence over point mode. The selected path packs the
 * resolved flat shading color and applies the active depth and blending state
 * while writing to the CPU framebuffer or invoking the filled-output callback.
 * Point mode instead colors each point with its own vertex color when the
 * triangle's vertex colors differ, and blends each point toward the fog color
 * by its own fog factor when fog is active.
 *
 * @param options Triangle buffer, rasterization collaborators, and output-mode
 * settings.
 * @param shading Prepared shading for the triangle, including its vertex offset.
 */
export function rasterizeTriangleOutput(
  options: TriangleOutputOptions,
  shading: TriangleShading,
): void {
  const { wireframe, points } = options;
  const packed = packColor(shading);
  if (wireframe) {
    rasterizeWireframe(options, shading, packed);
  } else if (points) {
    rasterizePoints(options, shading, packed);
  } else {
    const { scanlineFill, tb, texture, width, height } = options;
    const at = shading.vertexOffset;
    const callback = selectScanlineCallback(
      options.scanlineCallbacks,
      shading.isGouraud || shading.mixedVertexColor,
      shading.isFlat && !shading.mixedVertexColor,
      Boolean(texture),
    );
    scanlineFill.fill(
      tb.screenX[at],
      tb.screenY[at],
      tb.screenX[at + 1],
      tb.screenY[at + 1],
      tb.screenX[at + 2],
      tb.screenY[at + 2],
      width,
      height,
      callback,
    );
  }
}
