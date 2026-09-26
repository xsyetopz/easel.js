import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import {
  LinearSRGBColorSpace,
  NoColorSpace,
  SRGBColorSpace,
} from "@/core/Constants.js";
import {
  ColorManagement,
  LinearToSRGB,
  SRGBToLinear,
} from "@/math/ColorManagement.js";

const threeDecode = (value: number): number =>
  new THREE.Color().setRGB(value, value, value, SRGBColorSpace).r;
const threeEncode = (value: number): number =>
  new THREE.Color()
    .setRGB(value, value, value)
    .getRGB(new THREE.Color(), SRGBColorSpace).r;

describe("ColorManagement", () => {
  it("uses a linear working space like three.js r186", () => {
    expect(ColorManagement.enabled).toBe(true);
    expect(ColorManagement.workingColorSpace).toBe(LinearSRGBColorSpace);
    expect(ColorManagement.workingColorSpace).toBe(
      THREE.ColorManagement.workingColorSpace,
    );
  });

  it("matches three.js transfer functions at every 8-bit value", () => {
    for (let byte = 0; byte < 256; byte++) {
      const value = byte / 255;
      expect(SRGBToLinear(value)).toBe(threeDecode(value));
      expect(LinearToSRGB(value)).toBe(threeEncode(value));
    }
  });

  it("converts in place between sRGB and the working space", () => {
    const color = { r: 0.5, g: 0.25, b: 1 };
    expect(ColorManagement.colorSpaceToWorking(color, SRGBColorSpace)).toBe(
      color,
    );
    expect(color.r).toBe(threeDecode(0.5));
    expect(color.g).toBe(threeDecode(0.25));
    ColorManagement.workingToColorSpace(color, SRGBColorSpace);
    expect(color.r).toBeCloseTo(0.5, 4);
    expect(color.g).toBeCloseTo(0.25, 4);
    expect(color.b).toBeCloseTo(1, 4);
  });

  it("leaves channels unchanged for NoColorSpace, equal spaces, or when disabled", () => {
    const color = { r: 0.5, g: 0.5, b: 0.5 };
    ColorManagement.convert(color, NoColorSpace, SRGBColorSpace);
    ColorManagement.convert(color, SRGBColorSpace, SRGBColorSpace);
    expect(color.r).toBe(0.5);
    ColorManagement.enabled = false;
    try {
      ColorManagement.convert(color, SRGBColorSpace, LinearSRGBColorSpace);
    } finally {
      ColorManagement.enabled = true;
    }
    expect(color.r).toBe(0.5);
  });

  it("rejects unsupported color spaces", () => {
    expect(() =>
      ColorManagement.convert({ r: 0, g: 0, b: 0 }, "display-p3", "srgb"),
    ).toThrow("unsupported color space");
  });
});
