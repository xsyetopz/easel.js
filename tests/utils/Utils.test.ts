import { describe, expect, it } from "bun:test";
import { DataUtils, ImageUtils, ShapeUtils, TextureUtils } from "@/index.ts";
import type { ShapePoint2D } from "@/index.ts";

describe("ShapeUtils (class wrapper)", () => {
  it("area returns signed contour area (clockwise is negative)", () => {
    const cw: ShapePoint2D[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ];
    const ccw: ShapePoint2D[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(ShapeUtils.area(cw)).toBeLessThan(0);
    expect(ShapeUtils.area(ccw)).toBeGreaterThan(0);
  });

  it("isClockWise matches math/ShapeUtils.isShapeClockwise", () => {
    const cw: ShapePoint2D[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ];
    expect(ShapeUtils.isClockWise(cw)).toBe(true);
  });

  it("triangulateShape returns source-indexed faces", () => {
    const contour: ShapePoint2D[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const faces = ShapeUtils.triangulateShape(contour, []);
    expect(faces.length).toBe(2);
    for (const face of faces) {
      expect(face).toHaveLength(3);
      for (const index of face) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(4);
      }
    }
  });
});

describe("DataUtils (class wrapper)", () => {
  it("toHalfFloat encodes 1.0 as 0x3c00", () => {
    expect(DataUtils.toHalfFloat(1)).toBe(0x3c00);
  });

  it("fromHalfFloat decodes 0x3c00 as 1.0", () => {
    expect(DataUtils.fromHalfFloat(0x3c00)).toBe(1);
  });

  it("round-trips a value through toHalfFloat/fromHalfFloat", () => {
    const half = DataUtils.toHalfFloat(0.5);
    expect(DataUtils.fromHalfFloat(half)).toBeCloseTo(0.5, 3);
  });

  it("toHalfFloat encodes 0 as 0", () => {
    expect(DataUtils.toHalfFloat(0)).toBe(0);
  });

  it("fromHalfFloat decodes 0 as 0", () => {
    expect(DataUtils.fromHalfFloat(0)).toBe(0);
  });
});

describe("ImageUtils (class wrapper)", () => {
  const maybe = typeof document === "undefined" ? it.skip : it;
  maybe(
    "getDataUrl delegates to utils/ImageUtils.getDataUrl for canvas",
    () => {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const url = ImageUtils.getDataUrl(canvas);
      expect(url).toStartWith("data:image/png;base64,");
    },
  );
});

describe("TextureUtils (class wrapper)", () => {
  const maybe = typeof document === "undefined" ? it.skip : it;
  maybe(
    "getDataUrl delegates to utils/ImageUtils.getDataUrl for canvas",
    () => {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const url = TextureUtils.getDataUrl(canvas, "image/jpeg");
      expect(url).toStartWith("data:image/jpeg;base64,");
    },
  );
});
