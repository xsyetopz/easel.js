import { describe, expect, test } from "bun:test";
import {
  ColorManagement,
  Compatibility,
  InterpolationSamplingMode,
  InterpolationSamplingType,
  LinearTransfer,
  MOUSE,
  NoNormalPacking,
  NormalGAPacking,
  NormalRGPacking,
  SRGBTransfer,
  TOUCH,
  TriangleFanDrawMode,
  TriangleStripDrawMode,
  TrianglesDrawMode,
} from "@/index.ts";

describe("MOUSE", () => {
  test("defines button and interaction identifiers", () => {
    expect(MOUSE.LEFT).toBe(0);
    expect(MOUSE.MIDDLE).toBe(1);
    expect(MOUSE.RIGHT).toBe(2);
    expect(MOUSE.ROTATE).toBe(0);
    expect(MOUSE.DOLLY).toBe(1);
    expect(MOUSE.PAN).toBe(2);
  });
});

describe("TOUCH", () => {
  test("defines touch interaction identifiers", () => {
    expect(TOUCH.ROTATE).toBe(0);
    expect(TOUCH.PAN).toBe(1);
    expect(TOUCH.DOLLY_PAN).toBe(2);
    expect(TOUCH.DOLLY_ROTATE).toBe(3);
  });
});

describe("Draw mode constants", () => {
  test("define sequential numeric identifiers", () => {
    expect(TrianglesDrawMode).toBe(0);
    expect(TriangleStripDrawMode).toBe(1);
    expect(TriangleFanDrawMode).toBe(2);
  });
});

describe("Transfer and normal packing constants", () => {
  test("define string identifiers", () => {
    expect(LinearTransfer).toBe("linear");
    expect(SRGBTransfer).toBe("srgb");
    expect(NoNormalPacking).toBe("");
    expect(NormalRGPacking).toBe("rg");
    expect(NormalGAPacking).toBe("ga");
  });
});

describe("InterpolationSamplingMode", () => {
  test("defines sampling mode identifiers", () => {
    expect(InterpolationSamplingMode.NORMAL).toBe("normal");
    expect(InterpolationSamplingMode.CENTROID).toBe("centroid");
    expect(InterpolationSamplingMode.SAMPLE).toBe("sample");
    expect(InterpolationSamplingMode.FIRST).toBe("first");
    expect(InterpolationSamplingMode.EITHER).toBe("either");
  });
});

describe("InterpolationSamplingType", () => {
  test("defines sampling type identifiers", () => {
    expect(InterpolationSamplingType.PERSPECTIVE).toBe("perspective");
    expect(InterpolationSamplingType.LINEAR).toBe("linear");
    expect(InterpolationSamplingType.FLAT).toBe("flat");
  });
});

describe("Compatibility", () => {
  test("defines compatibility flag identifiers", () => {
    expect(Compatibility.TEXTURE_COMPARE).toBe("depthTextureCompare");
  });
});

describe("ColorManagement", () => {
  test("is disabled for CPU Canvas2D rendering", () => {
    expect(ColorManagement.enabled).toBe(false);
  });

  test("convert and transform functions are no-ops", () => {
    const color = { r: 0.5, g: 0.5, b: 0.5 };
    expect(ColorManagement.convert(color)).toBe(color);
    expect(ColorManagement.fromWorkingColorSpace(color)).toBe(color);
    expect(ColorManagement.toWorkingColorSpace(color)).toBe(color);
  });
});
