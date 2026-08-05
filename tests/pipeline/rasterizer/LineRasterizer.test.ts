import { describe, expect, it } from "bun:test";
import { Framebuffer } from "@/pipeline/framebuffer/Framebuffer.js";
import { LineBuffer } from "@/pipeline/LineBuffer.js";
import { LineRasterizer } from "@/pipeline/rasterizer/LineRasterizer.js";

function makeLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0 = -1,
  z1 = -1,
): LineBuffer {
  const line = new LineBuffer(1);
  line.append(x0, y0, x1, y1, z0, z1, 0, 0, 0, 1, 0, 1);
  return line;
}

function countNonBlack(framebuffer: Framebuffer): number {
  let count = 0;
  for (const pixel of framebuffer.u32) {
    if (pixel !== 0) count++;
  }
  return count;
}

describe("LineRasterizer", () => {
  it("includes both endpoints with bounded integer coverage", () => {
    const framebuffer = new Framebuffer(8, 8);
    new LineRasterizer().rasterize(
      makeLine(1, 3, 5, 3),
      { color: { r: 1, g: 0, b: 0 } },
      framebuffer,
    );
    expect(countNonBlack(framebuffer)).toBe(5);
    expect(framebuffer.getPixel(1, 3).r).toBe(255);
    expect(framebuffer.getPixel(5, 3).r).toBe(255);
  });

  it("expands a segment to a deterministic square width", () => {
    const framebuffer = new Framebuffer(8, 8);
    new LineRasterizer().rasterize(
      makeLine(2, 3, 2, 3),
      { linewidth: 3, color: { r: 0, g: 1, b: 0 } },
      framebuffer,
    );
    expect(countNonBlack(framebuffer)).toBe(9);
  });

  it("clips a centered wide footprint at the framebuffer edge", () => {
    const framebuffer = new Framebuffer(8, 8);
    new LineRasterizer().rasterize(
      makeLine(0, 3, 0, 3),
      { linewidth: 3, color: { r: 0, g: 1, b: 0 } },
      framebuffer,
    );
    let covered = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (framebuffer.getPixel(x, y).g !== 0) covered++;
      }
    }
    expect(covered).toBe(6);
    expect(framebuffer.getPixel(0, 2).g).toBe(255);
    expect(framebuffer.getPixel(1, 2).g).toBe(255);
    expect(framebuffer.getPixel(2, 2).g).toBe(0);
  });

  it("keeps vertical and diagonal wide coverage deterministic", () => {
    const vertical = new Framebuffer(8, 8);
    new LineRasterizer().rasterize(
      makeLine(3, 1, 3, 6),
      { linewidth: 3, color: { r: 0, g: 1, b: 0 } },
      vertical,
    );
    expect(countNonBlack(vertical)).toBe(24);
    expect(vertical.getPixel(2, 0).g).toBe(255);
    expect(vertical.getPixel(4, 7).g).toBe(255);

    const diagonal = new Framebuffer(8, 8);
    const reversed = new Framebuffer(8, 8);
    const diagonalMaterial = {
      linewidth: 3,
      color: { r: 0, g: 1, b: 1 },
    };
    new LineRasterizer().rasterize(
      makeLine(1, 1, 6, 6),
      diagonalMaterial,
      diagonal,
    );
    new LineRasterizer().rasterize(
      makeLine(6, 6, 1, 1),
      diagonalMaterial,
      reversed,
    );
    expect(countNonBlack(diagonal)).toBeGreaterThan(0);
    expect(diagonal.getPixel(1, 1).g).toBe(255);
    expect(Array.from(reversed.u32)).toEqual(Array.from(diagonal.u32));
  });

  it("deduplicates wide transparent coverage and is orientation invariant", () => {
    const first = new Framebuffer(8, 8);
    const second = new Framebuffer(8, 8);
    const blendProbe = new Framebuffer(8, 8);
    const overlapProbe = new Framebuffer(8, 8);
    const firstLines = makeLine(1, 3, 5, 3, -0.5, 0.5);
    const secondLines = new LineBuffer(1);
    secondLines.append(5, 3, 1, 3, 0.5, -0.5, 0, 0, 1, 0, 0, 1);
    const material = {
      linewidth: 3,
      color: { r: 1, g: 1, b: 1 },
      opacity: 4,
      transparent: true,
    };
    new LineRasterizer().rasterize(makeLine(1, 3, 5, 3), material, blendProbe);
    expect(blendProbe.getPixel(3, 3).r).toBe(128);
    const overlappingLines = new LineBuffer(2);
    overlappingLines.append(1, 3, 5, 3, -1, -1, 0, 0, 0, 1, 0, 1);
    overlappingLines.append(1, 3, 5, 3, -1, -1, 0, 0, 0, 1, 0, 1);
    new LineRasterizer().rasterize(overlappingLines, material, overlapProbe);
    expect(overlapProbe.getPixel(3, 3).r).toBe(192);
    const connectedLines = new LineBuffer(2);
    connectedLines.append(1, 3, 5, 3, -1, -1, 0, 0, 0, 1, 0, 1);
    connectedLines.append(1, 3, 5, 3, -1, -1, 0, 0, 0, 1, 0, 1, 0, true);
    const connectedProbe = new Framebuffer(8, 8);
    new LineRasterizer().rasterize(connectedLines, material, connectedProbe);
    expect(connectedProbe.getPixel(3, 3).r).toBe(128);
    new LineRasterizer().rasterize(
      firstLines,
      material,
      first,
      undefined,
      new Float32Array([1, 0, 0, 0, 0, 1]),
      3,
    );
    new LineRasterizer().rasterize(
      secondLines,
      material,
      second,
      undefined,
      new Float32Array([1, 0, 0, 0, 0, 1]),
      3,
    );
    expect(first.getPixel(3, 3).r).toBe(64);
    expect(first.getPixel(3, 3).g).toBe(0);
    expect(first.getPixel(3, 3).b).toBe(64);
    expect(Array.from(second.u32)).toEqual(Array.from(first.u32));
    expect(Array.from(second.depthBuffer.data)).toEqual(
      Array.from(first.depthBuffer.data),
    );
  });

  it("interpolates geometry colors along each segment", () => {
    const framebuffer = new Framebuffer(8, 8);
    new LineRasterizer().rasterize(
      makeLine(1, 3, 5, 3),
      { color: { r: 1, g: 1, b: 1 } },
      framebuffer,
      undefined,
      new Float32Array([1, 0, 0, 0, 0, 1]),
      3,
    );
    const middle = framebuffer.getPixel(3, 3);
    expect(middle.r).toBeGreaterThan(0);
    expect(middle.b).toBeGreaterThan(0);
  });

  it("interpolates fog colors without entering the triangle lighting path", () => {
    const framebuffer = new Framebuffer(8, 8);
    const line = new LineBuffer(1);
    line.append(1, 3, 5, 3, -1, -1, 0, 1, 0, 1, 0, 1);
    new LineRasterizer().rasterize(
      line,
      { color: { r: 1, g: 0, b: 0 } },
      framebuffer,
      { r: 0, g: 0, b: 1 },
    );
    const near = framebuffer.getPixel(1, 3);
    const far = framebuffer.getPixel(5, 3);
    expect(near.r).toBeGreaterThan(240);
    expect(near.b).toBeLessThan(20);
    expect(far.r).toBeLessThan(20);
    expect(far.b).toBeGreaterThan(240);
  });

  it("respects depth test and depth write independently", () => {
    const framebuffer = new Framebuffer(8, 8);
    new LineRasterizer().rasterize(
      makeLine(1, 3, 5, 3, 0, 0),
      { color: { r: 1, g: 0, b: 0 } },
      framebuffer,
    );
    new LineRasterizer().rasterize(
      makeLine(1, 3, 5, 3, 1, 1),
      { color: { r: 0, g: 1, b: 0 } },
      framebuffer,
    );
    expect(framebuffer.getPixel(3, 3).r).toBe(255);

    const noTest = new Framebuffer(8, 8);
    new LineRasterizer().rasterize(
      makeLine(1, 3, 5, 3, 0, 0),
      { color: { r: 1, g: 0, b: 0 } },
      noTest,
    );
    new LineRasterizer().rasterize(
      makeLine(1, 3, 5, 3, 1, 1),
      { color: { r: 0, g: 1, b: 0 }, depthTest: false, depthWrite: false },
      noTest,
    );
    expect(noTest.getPixel(3, 3).g).toBe(255);
  });

  it("keeps depth writes enabled when depth testing is disabled", () => {
    const framebuffer = new Framebuffer(8, 8);
    new LineRasterizer().rasterize(
      makeLine(1, 3, 5, 3, 0, 0),
      { color: { r: 1, g: 0, b: 0 }, depthTest: false, depthWrite: true },
      framebuffer,
    );
    expect(framebuffer.depthBuffer.data[3 * 8 + 3]).toBe(32768);
    new LineRasterizer().rasterize(
      makeLine(1, 3, 5, 3, 1, 1),
      { color: { r: 0, g: 1, b: 0 } },
      framebuffer,
    );
    expect(framebuffer.getPixel(3, 3).r).toBe(255);
    expect(framebuffer.getPixel(3, 3).g).toBe(0);
  });

  it("lets a nearer self-intersection replace a farther connected segment", () => {
    const framebuffer = new Framebuffer(8, 8);
    const lines = new LineBuffer(2);
    lines.append(1, 3, 5, 3, 0.5, 0.5, 0, 0, 0, 0, 0, 1);
    lines.append(3, 1, 3, 5, -0.5, -0.5, 0, 0, 1, 1, 0, 1, 0, true);
    new LineRasterizer().rasterize(
      lines,
      { color: { r: 1, g: 1, b: 1 } },
      framebuffer,
      undefined,
      new Float32Array([1, 0, 0, 0, 1, 0]),
      3,
    );
    const intersection = framebuffer.getPixel(3, 3);
    expect(intersection.r).toBe(0);
    expect(intersection.g).toBe(255);
    expect(framebuffer.depthBuffer.data[3 * 8 + 3]).toBe(16384);
  });

  it("skips dash gaps without touching depth", () => {
    const framebuffer = new Framebuffer(8, 8);
    new LineRasterizer().rasterize(
      makeLine(1, 3, 6, 3),
      { dashSize: 2, gapSize: 2, color: { r: 1, g: 0, b: 0 } },
      framebuffer,
    );
    expect(framebuffer.getPixel(1, 3).r).toBe(255);
    expect(framebuffer.getPixel(2, 3).r).toBe(255);
    expect(framebuffer.getPixel(3, 3).r).toBe(0);
    expect(framebuffer.depthBuffer.data[3 * 8 + 3]).toBe(0xffff);
  });

  it("restarts dash phase for each logical segment in pixel space", () => {
    const framebuffer = new Framebuffer(8, 8);
    const lines = new LineBuffer(2);
    lines.append(1, 3, 4, 3, -1, -1, 0, 0, 0, 1, 0, 1);
    lines.append(4, 3, 7, 3, -1, -1, 0, 0, 1, 2, 0, 1);
    new LineRasterizer().rasterize(
      lines,
      { dashSize: 2, gapSize: 2, color: { r: 1, g: 0, b: 0 } },
      framebuffer,
    );
    // A cumulative world-distance phase would leave the second segment's
    // shared endpoint in a gap; EASEL intentionally restarts at step zero.
    expect(framebuffer.getPixel(4, 3).r).toBe(255);
    expect(framebuffer.getPixel(6, 3).r).toBe(0);
  });

  it("starts a clipped dash pattern at its stored pre-clip phase", () => {
    const framebuffer = new Framebuffer(8, 8);
    const lines = new LineBuffer(1);
    lines.append(0, 3, 7, 3, -1, -1, 0, 0, 0, 1, 0, 1, 2);
    new LineRasterizer().rasterize(
      lines,
      { dashSize: 2, gapSize: 2, color: { r: 1, g: 0, b: 0 } },
      framebuffer,
    );
    expect(framebuffer.getPixel(0, 3).r).toBe(0);
    expect(framebuffer.getPixel(1, 3).r).toBe(0);
    expect(framebuffer.getPixel(2, 3).r).toBe(255);
    expect(framebuffer.getPixel(3, 3).r).toBe(255);
  });

  it("rejects fractional or out-of-viewport walker inputs instead of spinning", () => {
    const framebuffer = new Framebuffer(8, 8);
    const fractional = {
      length: 1,
      screenX: new Float32Array([1.5, 5]),
      screenY: new Int32Array([3, 3]),
      ndcZ: new Float32Array([-1, -1]),
      fogFactor: new Float32Array([0, 0]),
      vertexIndex: new Uint32Array([0, 1]),
      sourceT: new Float32Array([0, 1]),
      dashPhase: new Float32Array([0]),
      continuesPrevious: new Uint8Array([0]),
    } as unknown as LineBuffer;
    expect(() =>
      new LineRasterizer().rasterize(fractional, {}, framebuffer),
    ).toThrow(RangeError);

    const outside = makeLine(1, 3, 5, 3);
    outside.screenX[0] = -1;
    expect(() =>
      new LineRasterizer().rasterize(outside, {}, framebuffer),
    ).toThrow(RangeError);
  });
});
