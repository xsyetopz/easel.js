import { Framebuffer } from "@/pipeline/framebuffer/Framebuffer.js";
import { Rasterizer } from "@/pipeline/rasterizer/Rasterizer.js";
import { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";

export type RasterDrawCall = Parameters<Rasterizer["rasterize"]>[0];
export type PixelColor = { r: number; g: number; b: number };

export function makeRasterizerFixture(width = 20, height = 20) {
  return {
    rasterizer: new Rasterizer(),
    framebuffer: new Framebuffer(width, height),
  };
}

export function appendCenterTriangle(
  triangles: TriangleBuffer,
  z: number,
  u0 = 0,
  v0 = 0,
  u1 = 0,
  v1 = 0,
  u2 = 0,
  v2 = 0,
): void {
  triangles.append(
    8,
    5,
    12,
    5,
    10,
    10,
    z,
    z,
    z,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    u0,
    v0,
    u1,
    v1,
    u2,
    v2,
  );
}

export function makeTriangleBufferWithCenterTriangle(
  z: number,
  u0 = 0,
  v0 = 0,
  u1 = 0,
  v1 = 0,
  u2 = 0,
  v2 = 0,
): TriangleBuffer {
  const triangles = new TriangleBuffer(1);
  appendCenterTriangle(triangles, z, u0, v0, u1, v1, u2, v2);
  triangles.buildSortOrder();
  return triangles;
}

export function makeRasterDrawCall(
  material: Record<string, unknown> = {},
  triangles = makeTriangleBufferWithCenterTriangle(-1),
): RasterDrawCall {
  return {
    triangles,
    material: { wireframe: false, points: false, ...material },
  };
}

export function makeEmptyRasterDrawCall(): RasterDrawCall {
  const triangles = new TriangleBuffer(1);
  triangles.buildSortOrder();
  return { triangles, material: {} };
}

export function countNonBlackPixels(framebuffer: Framebuffer): number {
  let count = 0;
  for (const pixel of framebuffer.u32) {
    if (pixel !== 0) count++;
  }
  return count;
}

export function collectNonBlackPixels(framebuffer: Framebuffer): PixelColor[] {
  const pixels: PixelColor[] = [];
  for (let y = 0; y < framebuffer.height; y++) {
    for (let x = 0; x < framebuffer.width; x++) {
      const pixel = framebuffer.getPixel(x, y);
      if (pixel.r !== 0 || pixel.g !== 0 || pixel.b !== 0) {
        pixels.push({ r: pixel.r, g: pixel.g, b: pixel.b });
      }
    }
  }
  return pixels;
}
