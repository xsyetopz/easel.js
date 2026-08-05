import { describe, expect, it } from "bun:test";
import { Wrapping } from "@/core/Constants.ts";
import { textureCoordinateToTexel } from "@/pipeline/texture/TextureWrapping.ts";

describe("textureCoordinateToTexel", () => {
  it("clamps coordinates to the edge texels", () => {
    expect(textureCoordinateToTexel(-0.1, 4, Wrapping.ClampToEdge)).toBe(0);
    expect(textureCoordinateToTexel(0.25, 4, Wrapping.ClampToEdge)).toBe(1);
    expect(textureCoordinateToTexel(1, 4, Wrapping.ClampToEdge)).toBe(3);
  });

  it("preserves texel-centered UVs within a 64-pixel atlas", () => {
    for (let texel = 8; texel <= 15; texel++) {
      const center = (texel + 0.5) / 64;
      expect(textureCoordinateToTexel(center, 64, Wrapping.ClampToEdge)).toBe(
        texel,
      );
    }
  });

  it("repeats negative and positive coordinates at non-power-of-two sizes", () => {
    expect(textureCoordinateToTexel(-0.01, 3, Wrapping.Repeat)).toBe(2);
    expect(textureCoordinateToTexel(1, 3, Wrapping.Repeat)).toBe(0);
    expect(textureCoordinateToTexel(1.5, 3, Wrapping.Repeat)).toBe(1);
    expect(textureCoordinateToTexel(2.99, 3, Wrapping.Repeat)).toBe(2);
  });

  it("mirrors alternating tiles continuously in both directions", () => {
    expect(textureCoordinateToTexel(-1, 4, Wrapping.MirroredRepeat)).toBe(3);
    expect(textureCoordinateToTexel(-0.25, 4, Wrapping.MirroredRepeat)).toBe(1);
    expect(textureCoordinateToTexel(0, 4, Wrapping.MirroredRepeat)).toBe(0);
    expect(textureCoordinateToTexel(1, 4, Wrapping.MirroredRepeat)).toBe(3);
    expect(textureCoordinateToTexel(1.25, 4, Wrapping.MirroredRepeat)).toBe(3);
    expect(textureCoordinateToTexel(1.75, 4, Wrapping.MirroredRepeat)).toBe(1);
    expect(textureCoordinateToTexel(2, 4, Wrapping.MirroredRepeat)).toBe(0);
  });
});
