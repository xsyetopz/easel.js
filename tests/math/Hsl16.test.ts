import { describe, expect, it } from "bun:test";
import {
  decodeHsl16,
  encodeHsl16,
  HSL16_BLACK,
  HSL16_WHITE,
} from "@/math/Hsl16.js";

describe("Hsl16", () => {
  it("BLACK constant encodes to zero lightness", () => {
    const decoded = decodeHsl16(HSL16_BLACK);
    expect(decoded.l).toBeCloseTo(0, 2);
  });

  it("WHITE constant encodes to full lightness", () => {
    const decoded = decodeHsl16(HSL16_WHITE);
    expect(decoded.l).toBeCloseTo(1, 2);
  });

  it("round-trips h=0.5, s=0.5, l=0.5 within packing precision", () => {
    const packed = encodeHsl16(0.5, 0.5, 0.5);
    const { h, s, l } = decodeHsl16(packed);
    // h: 6-bit (1/63 ≈ 0.016), s: 3-bit (1/7 ≈ 0.14), l: 7-bit (1/127 ≈ 0.008)
    expect(Math.abs(h - 0.5)).toBeLessThan(0.02);
    expect(Math.abs(s - 0.5)).toBeLessThan(0.15);
    expect(Math.abs(l - 0.5)).toBeLessThan(0.01);
  });

  it("round-trips boundary h=0, s=0, l=0", () => {
    const packed = encodeHsl16(0, 0, 0);
    const { h, s, l } = decodeHsl16(packed);
    expect(h).toBeCloseTo(0, 2);
    expect(s).toBeCloseTo(0, 2);
    expect(l).toBeCloseTo(0, 2);
  });

  it("round-trips boundary h=1, s=1, l=1", () => {
    const packed = encodeHsl16(1, 1, 1);
    const { l } = decodeHsl16(packed);
    expect(l).toBeCloseTo(1, 2);
  });

  it("encode returns a number", () => {
    expect(typeof encodeHsl16(0.1, 0.2, 0.3)).toBe("number");
  });

  it("BLACK and WHITE are different values", () => {
    expect(HSL16_BLACK).not.toBe(HSL16_WHITE);
  });
});
