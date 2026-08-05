import { describe, expect, it } from "bun:test";
import { getDataUrl, srgbToLinear } from "@/utils/ImageUtils.js";

describe("ImageUtils", () => {
  it("converts byte RGB channels without mutating source data or alpha", () => {
    const source = new Uint8ClampedArray([128, 64, 255, 117]);
    const converted = srgbToLinear({
      data: source,
      width: 1,
      height: 1,
    });

    expect(Array.from(source)).toEqual([128, 64, 255, 117]);
    expect(Array.from(converted.data)).toEqual([55, 13, 255, 117]);
    expect(converted.data).not.toBe(source);
  });

  it("converts floating-point RGB channels while preserving alpha", () => {
    const source = new Float32Array([0.04045, 0.5, 1, 0.25]);
    const converted = srgbToLinear({
      data: source,
      width: 1,
      height: 1,
    });

    expect(converted.data[0]).toBeCloseTo(0.04045 / 12.92, 7);
    expect(converted.data[1]).toBeCloseTo(0.21404114, 7);
    expect(converted.data[2]).toBe(1);
    expect(converted.data[3]).toBe(0.25);
  });

  it("rejects inconsistent raw image dimensions", () => {
    expect(() =>
      srgbToLinear({
        data: new Uint8Array(3),
        width: 1,
        height: 1,
      }),
    ).toThrow("width * height * 4");
  });

  it("fails explicitly when canvas allocation is unavailable", () => {
    expect(() =>
      getDataUrl({
        width: 1,
        height: 1,
        data: new Uint8ClampedArray(4),
      } as ImageData),
    ).toThrow("requires a document");
  });
});
