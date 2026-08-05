import { describe, expect, it } from "bun:test";
import { WireframeRasterizer } from "@/pipeline/rasterizer/WireframeRasterizer.js";

describe("WireframeRasterizer", () => {
  it("clips fractional/offscreen triangle edges before the bounded walker", () => {
    const pixels: Array<[number, number]> = [];
    new WireframeRasterizer().rasterize(
      -12.5,
      2.5,
      4.5,
      2.5,
      4.5,
      14.5,
      (x, y) => pixels.push([x, y]),
      8,
      8,
    );
    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.every(([x, y]) => x >= 0 && x < 8 && y >= 0 && y < 8)).toBe(
      true,
    );
  });
});
