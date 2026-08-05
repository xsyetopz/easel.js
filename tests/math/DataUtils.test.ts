import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { fromHalfFloat, toHalfFloat } from "@/math/DataUtils.js";

interface DataUtilsLike {
  fromHalfFloat(value: number): number;
  toHalfFloat(value: number): number;
}

const THREEDataUtils = (THREE as unknown as { DataUtils: DataUtilsLike })
  .DataUtils;

describe("DataUtils", () => {
  it("matches THREE.js for exactly representable finite values", () => {
    for (const value of [0, -0, 1, -2, 0.5, 65504, 2 ** -24]) {
      const half = toHalfFloat(value);
      expect(half).toBe(THREEDataUtils.toHalfFloat(value));
      expect(fromHalfFloat(half)).toBe(THREEDataUtils.fromHalfFloat(half));
    }
  });

  it("rounds halfway cases to the nearest even binary16 value", () => {
    expect(toHalfFloat(1 + 2 ** -11)).toBe(0x3c00);
    expect(toHalfFloat(1 + 3 * 2 ** -11)).toBe(0x3c02);
  });

  it("preserves IEEE infinities instead of silently saturating", () => {
    expect(toHalfFloat(Number.POSITIVE_INFINITY)).toBe(0x7c00);
    expect(toHalfFloat(Number.NEGATIVE_INFINITY)).toBe(0xfc00);
    expect(toHalfFloat(70000)).toBe(0x7c00);
  });

  it("converts binary16 special and subnormal values", () => {
    expect(fromHalfFloat(0x0001)).toBe(2 ** -24);
    expect(fromHalfFloat(0x7c00)).toBe(Number.POSITIVE_INFINITY);
    expect(fromHalfFloat(0xfc00)).toBe(Number.NEGATIVE_INFINITY);
    expect(Number.isNaN(fromHalfFloat(0x7e00))).toBe(true);
  });

  it("round-trips every non-NaN binary16 encoding", () => {
    for (let half = 0; half <= 0xffff; half++) {
      const exponent = (half >>> 10) & 0x1f;
      const mantissa = half & 0x3ff;
      if (exponent === 0x1f && mantissa !== 0) continue;
      expect(toHalfFloat(fromHalfFloat(half))).toBe(half);
    }
  });

  it("matches the platform binary16 conversion", () => {
    const native = new globalThis.Float16Array(1);
    const bits = new Uint16Array(native.buffer);
    for (const value of [
      -70000,
      -1.0007,
      -(2 ** -20),
      -(2 ** -25),
      2 ** -25,
      2 ** -20,
      1.0007,
      70000,
    ]) {
      native[0] = value;
      expect(toHalfFloat(value)).toBe(bits[0]);
    }
  });

  it("rejects values that are not 16-bit integer encodings", () => {
    for (const value of [-1, 0x10000, 1.5, Number.NaN]) {
      expect(() => fromHalfFloat(value)).toThrow(RangeError);
    }
  });
});
