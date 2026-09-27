import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import {
  LinearSRGBColorSpace,
  NoColorSpace,
  SRGBColorSpace,
} from "@/core/Constants.js";
import { Color } from "@/math/Color.js";
import {
  ColorManagement,
  decodesSrgbToWorking,
  LinearToSRGB,
  SRGB_BYTE_TO_LINEAR,
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

  it("decodes every 8-bit sRGB value through the table exactly", () => {
    expect(SRGB_BYTE_TO_LINEAR.length).toBe(256);
    for (let byte = 0; byte < 256; byte++) {
      expect(
        Object.is(SRGB_BYTE_TO_LINEAR[byte], SRGBToLinear(byte / 255)),
      ).toBe(true);
      expect(
        Object.is(SRGB_BYTE_TO_LINEAR[byte], threeDecode(byte / 255)),
      ).toBe(true);
    }
  });

  it("decodes hex and rgb() input like three.js for every 8-bit channel", () => {
    const color = new Color();
    const threeColor = new THREE.Color();
    for (let byte = 0; byte < 256; byte++) {
      const other = 255 - byte;
      const hex = (byte << 16) | (other << 8) | (byte ^ 0x5a);
      color.setHex(hex);
      threeColor.setHex(hex);
      expect([color.r, color.g, color.b]).toEqual([
        threeColor.r,
        threeColor.g,
        threeColor.b,
      ]);
      const style = `rgb(${byte},${other},${byte ^ 0x5a})`;
      color.setStyle(style);
      threeColor.setStyle(style);
      expect([color.r, color.g, color.b]).toEqual([
        threeColor.r,
        threeColor.g,
        threeColor.b,
      ]);
    }
  });

  it("uses the decode table only for sRGB input into a linear working space", () => {
    expect(decodesSrgbToWorking(SRGBColorSpace)).toBe(true);
    expect(decodesSrgbToWorking(LinearSRGBColorSpace)).toBe(false);
    expect(decodesSrgbToWorking(NoColorSpace)).toBe(false);
    ColorManagement.enabled = false;
    try {
      expect(decodesSrgbToWorking(SRGBColorSpace)).toBe(false);
      expect(new Color().setHex(0x80ff00).r).toBe(128 / 255);
    } finally {
      ColorManagement.enabled = true;
    }
    expect(new Color().setHex(0x80ff00, LinearSRGBColorSpace).r).toBe(
      128 / 255,
    );
    expect(() => new Color().setStyle("rgb(256,0,0)")).toThrow(RangeError);
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
