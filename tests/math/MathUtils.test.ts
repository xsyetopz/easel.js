import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import {
  clamp,
  fastAtan2,
  isPowerOf2,
  nextPowerOf2,
  tileDistance,
} from "@/math/MathUtils.js";

describe("MathUtils", () => {
  describe("clamp", () => {
    it("clamps value within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-1, 0, 10)).toBe(0);
      expect(clamp(11, 0, 10)).toBe(10);
    });

    it("clamps at boundaries", () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe("fastAtan2", () => {
    const cases = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];
    for (const [y, x] of cases) {
      it(`fastAtan2(${y}, ${x}) approximates Math.atan2`, () => {
        expect(Math.abs(fastAtan2(y, x) - Math.atan2(y, x))).toBeLessThan(0.01);
      });
    }
  });

  describe("isPowerOf2", () => {
    it("returns true for powers of two", () => {
      expect(isPowerOf2(1)).toBe(true);
      expect(isPowerOf2(2)).toBe(true);
      expect(isPowerOf2(4)).toBe(true);
      expect(isPowerOf2(1024)).toBe(true);
    });

    it("returns false for non-powers", () => {
      expect(isPowerOf2(0)).toBe(false);
      expect(isPowerOf2(3)).toBe(false);
      expect(isPowerOf2(6)).toBe(false);
    });
  });

  describe("nextPowerOf2", () => {
    it("returns next power of two", () => {
      expect(nextPowerOf2(1)).toBe(1);
      expect(nextPowerOf2(2)).toBe(2);
      expect(nextPowerOf2(3)).toBe(4);
      expect(nextPowerOf2(5)).toBe(8);
      expect(nextPowerOf2(100)).toBe(128);
    });
  });

  describe("tileDistance", () => {
    it("computes Manhattan distance", () => {
      expect(tileDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
      expect(tileDistance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
      expect(tileDistance({ x: -1, y: -1 }, { x: 1, y: 1 })).toBe(4);
    });
  });
});
