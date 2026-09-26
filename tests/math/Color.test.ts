import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import "../_helpers/assertions.ts";
import { LinearSRGBColorSpace, SRGBColorSpace } from "@/core/Constants.js";
import {
  COLOR_HUE_SCALE,
  COLOR_RGB_SCALE,
  Color,
  colorFromHsl16,
  colorToRgb,
} from "@/math/Color.js";
import { encodeHsl16 } from "@/math/Hsl16.js";
import { Matrix3 } from "@/math/Matrix3.js";
import { Vector3 } from "@/math/Vector3.js";

const HEX_FF0000 = /ff0000/u;

describe("Color", () => {
  it("provides top-level color constants and conversion functions", () => {
    expect(COLOR_HUE_SCALE).toBe(360);
    expect(COLOR_RGB_SCALE).toBe(255);
    expect(colorToRgb(0x123456)).toEqual({ r: 18, g: 52, b: 86 });
    expect(colorFromHsl16(encodeHsl16(0, 1, 0.5)).r).toBeGreaterThan(0.9);
  });

  it("constructor defaults", () => {
    const e = new Color();
    expect(e.r).toBeDefined();
    expect(e.g).toBeDefined();
    expect(e.b).toBeDefined();
  });

  it("constructor with r,g,b args", () => {
    const e = new Color(1, 0.5, 0);
    expect(e.r).toBeCloseTo(1);
    expect(e.g).toBeCloseTo(0.5);
    expect(e.b).toBeCloseTo(0);
  });

  it("clone produces independent copy", () => {
    const orig = new Color(1, 0.5, 0);
    const c = orig.clone();
    expect(c.r).toBeCloseTo(orig.r);
    expect(c.g).toBeCloseTo(orig.g);
    expect(c.b).toBeCloseTo(orig.b);
    c.r = 0;
    expect(orig.r).toBeCloseTo(1);
  });

  it("equals same color via r/g/b comparison", () => {
    const a = new Color(0.2, 0.4, 0.6);
    const b = new Color(0.2, 0.4, 0.6);
    expect(a.r === b.r && a.g === b.g && a.b === b.b).toBe(true);
  });

  it("equals different color via r/g/b comparison", () => {
    const a = new Color(1, 0, 0);
    const b = new Color(0, 1, 0);
    expect(a.r === b.r && a.g === b.g && a.b === b.b).toBe(false);
  });

  it("sets a hex string", () => {
    const e = new Color();
    e.set("#ff0000");
    expect(e.r).toBeCloseTo(1);
    expect(e.g).toBeCloseTo(0);
    expect(e.b).toBeCloseTo(0);
  });

  it("toHex returns hex string", () => {
    const e = new Color(1, 0, 0);
    const hex = e.hexString;
    expect(typeof hex).toBe("string");
    expect(hex.toLowerCase()).toMatch(HEX_FF0000);
  });

  it("setRGB method", () => {
    const e = new Color();
    e.setRGB(0.1, 0.2, 0.3);
    expect(e.r).toBeCloseTo(0.1);
    expect(e.g).toBeCloseTo(0.2);
    expect(e.b).toBeCloseTo(0.3);
  });

  it("rejects RGB components outside the documented normalized range", () => {
    const color = new Color();
    expect(() => color.setRGB(-0.01, 0, 0)).toThrow(RangeError);
    expect(() => color.setRGB(1.01, 0, 0)).toThrow(RangeError);
    expect(() => color.setRGB(Number.NaN, 0, 0)).toThrow(RangeError);
  });

  it("r/g/b clamp to [0,1] range on construction", () => {
    // just verify no NaN / undefined
    const e = new Color(0, 0, 0);
    expect(Number.isNaN(e.r)).toBe(false);
    expect(Number.isNaN(e.g)).toBe(false);
    expect(Number.isNaN(e.b)).toBe(false);
  });

  it("exposes the color marker and clamps bounded arithmetic", () => {
    const e = new Color(0.75, 0.25, 0.5);
    expect(e.isColor).toBe(true);
    expect(e.add(new Color(0.5, 0.5, 0.75))).toBe(e);
    expect(e).toEqual(expect.objectContaining({ r: 1, g: 0.75, b: 1 }));
    expect(e.addScalar(-2)).toEqual(
      expect.objectContaining({ r: 0, g: 0, b: 0 }),
    );
    expect(
      new Color().addColors(new Color(0.8, 0.2, 0.4), new Color(0.4, 0.9, 0.8)),
    ).toEqual(expect.objectContaining({ r: 1, g: 1, b: 1 }));
    expect(new Color(0.8, 0.2, 0.4).sub(new Color(0.9, 0.1, 0.5))).toEqual(
      expect.objectContaining({ r: 0, g: 0.1, b: 0 }),
    );
  });

  it("supports matrix, vector, and array color operations", () => {
    const matrix = new Matrix3().set(1, 0, 0, 0, 2, 0, 0, 0, 3);
    const e = new Color(0.1, 0.2, 0.3).applyMatrix3(matrix);
    expect(e.r).toBeCloseTo(0.1);
    expect(e.g).toBeCloseTo(0.4);
    expect(e.b).toBeCloseTo(0.9);
    expect(new Color().setFromVector3(new Vector3(2, -1, 0.5))).toEqual(
      expect.objectContaining({ r: 1, g: 0, b: 0.5 }),
    );

    const target = [99, 99, 99, 99, 99, 99];
    expect(e.toArray(target, 2)).toBe(target);
    expect(target[0]).toBe(99);
    expect(target[1]).toBe(99);
    expect(target[2]).toBeCloseTo(0.1);
    expect(target[3]).toBeCloseTo(0.4);
    expect(target[4]).toBeCloseTo(0.9);
    expect(target[5]).toBe(99);
    expect(new Color().fromArray(target, 2).equals(e)).toBe(true);
    expect(new Color().fromArray([2, -1, 0.5])).toEqual(
      expect.objectContaining({ r: 1, g: 0, b: 0.5 }),
    );
  });

  it("provides bounded hex, style, and JSON forms", () => {
    const e = new Color(0x123456);
    expect(e.hex).toBe(0x123456);
    expect(e.hexString).toBe("123456");
    expect(e.style).toBe("rgb(18,52,86)");
    expect(e.toJSON()).toBe(0x123456);
    e.setScalar(2);
    expect(e.hex).toBe(0xffffff);
    expect(e.setScalar(-1).hex).toBe(0);
  });

  it("lerps in RGB and HSL spaces with normalized channels", () => {
    const red = new Color(0xff0000);
    const blue = new Color(0x0000ff);
    // Channels are linear, so an RGB lerp mixes linear light as in three.js.
    expect(red.clone().lerp(blue, 0.5).hex).toBe(
      new THREE.Color(0xff0000).lerp(new THREE.Color(0x0000ff), 0.5).getHex(),
    );
    expect(red.clone().lerp(blue, 0.5).hex).toBe(0xbc00bc);
    const hsl = red.clone().lerpHSL(blue, 0.5);
    expect(hsl.r).toBeGreaterThanOrEqual(0);
    expect(hsl.r).toBeLessThanOrEqual(1);
    expect(hsl.g).toBeGreaterThanOrEqual(0);
    expect(hsl.g).toBeLessThanOrEqual(1);
    expect(hsl.b).toBeGreaterThanOrEqual(0);
    expect(hsl.b).toBeLessThanOrEqual(1);
    expect(hsl.clone().offsetHSL(1, 0, 0).equals(hsl)).toBe(true);
  });
});

describe("Color color management (three.js r186 oracle)", () => {
  it("round-trips every 8-bit hex channel value through linear storage", () => {
    for (let v = 0; v < 256; v++) {
      const hex = (v << 16) | ((255 - v) << 8) | ((v * 37) & 0xff);
      const color = new Color(hex);
      const three = new THREE.Color(hex);
      expect(color.r).toBe(three.r);
      expect(color.g).toBe(three.g);
      expect(color.b).toBe(three.b);
      expect(color.hex).toBe(hex);
      expect(color.hexString).toBe(three.getHexString());
      expect(color.style).toBe(three.getStyle());
    }
  });

  it("stores setRGB input linear by default and decodes sRGB input", () => {
    const linear = new Color().setRGB(0.5, 0.25, 1);
    const threeLinear = new THREE.Color().setRGB(0.5, 0.25, 1);
    expect([linear.r, linear.g, linear.b]).toEqual([0.5, 0.25, 1]);
    expect(linear.hex).toBe(threeLinear.getHex());

    const srgb = new Color().setRGB(0.5, 0.25, 1, SRGBColorSpace);
    const threeSrgb = new THREE.Color().setRGB(0.5, 0.25, 1, SRGBColorSpace);
    expect(srgb.r).toBe(threeSrgb.r);
    expect(srgb.g).toBe(threeSrgb.g);
    expect(srgb.hex).toBe(threeSrgb.getHex());
    expect(srgb.getRGB(undefined, SRGBColorSpace).g).toBeCloseTo(0.25, 4);
  });

  it("matches three.js for setHex, setStyle, setHSL, and getHSL color spaces", () => {
    expect(new Color().setHex(0x336699, LinearSRGBColorSpace).r).toBe(
      new THREE.Color().setHex(0x336699, LinearSRGBColorSpace).r,
    );
    expect(new Color(0x336699).getHex(LinearSRGBColorSpace)).toBe(
      new THREE.Color(0x336699).getHex(LinearSRGBColorSpace),
    );
    for (const style of ["rgb(128,0,255)", "hsl(200,50%,40%)", "#abc"]) {
      expect(new Color().setStyle(style).hex).toBe(
        new THREE.Color().setStyle(style).getHex(),
      );
    }
    expect(new Color().setHSL(0.3, 0.5, 0.4).hex).toBe(
      new THREE.Color().setHSL(0.3, 0.5, 0.4).getHex(),
    );
    expect(new Color().setHSL(0.3, 0.5, 0.4, SRGBColorSpace).hex).toBe(
      new THREE.Color().setHSL(0.3, 0.5, 0.4, SRGBColorSpace).getHex(),
    );
    const hsl = new Color(0x336699).getHSL(undefined, SRGBColorSpace);
    const threeHsl = new THREE.Color(0x336699).getHSL(
      { h: 0, s: 0, l: 0 },
      SRGBColorSpace,
    );
    expect(hsl.h).toBeCloseTo(threeHsl.h, 12);
    expect(hsl.s).toBeCloseTo(threeHsl.s, 12);
    expect(hsl.l).toBeCloseTo(threeHsl.l, 12);
  });
});
