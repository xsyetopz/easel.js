import { describe, expect, it } from "bun:test";
import { decodeHsl16, encodeHsl16 } from "@/math/Hsl16.js";
import { TranslucencyTable } from "@/pipeline/color/TranslucencyTable.js";

describe("TranslucencyTable", () => {
  const table = new TranslucencyTable();
  const src = encodeHsl16(0, 1, 0.5); // red
  const dst = encodeHsl16(0.67, 1, 0.5); // blue

  it("step=0 returns dst (fully transparent)", () => {
    expect(table.blend(src, dst, 0)).toBe(dst);
  });

  it("step=8 returns src (fully opaque)", () => {
    expect(table.blend(src, dst, 8)).toBe(src);
  });

  it("step=4 returns a value between src and dst", () => {
    const mid = table.blend(src, dst, 4);
    expect(mid).not.toBe(src);
    expect(mid).not.toBe(dst);
    const { l: lMid } = decodeHsl16(mid);
    const { l: lSrc } = decodeHsl16(src);
    const { l: lDst } = decodeHsl16(dst);
    // Lightness should be midpoint (both src and dst have l=0.5 so same)
    expect(lMid).toBeCloseTo((lSrc + lDst) / 2, 1);
  });

  it("blend returns a number", () => {
    expect(typeof table.blend(src, dst, 4)).toBe("number");
  });
});
