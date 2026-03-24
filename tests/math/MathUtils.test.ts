import { describe, expect, it } from "vitest";
import "../_helpers/assertions.js";
import { MathUtils } from "@/math/MathUtils.js";

describe("MathUtils", () => {
	describe("clamp", () => {
		it("clamps value within range", () => {
			expect(MathUtils.clamp(5, 0, 10)).toBe(5);
			expect(MathUtils.clamp(-1, 0, 10)).toBe(0);
			expect(MathUtils.clamp(11, 0, 10)).toBe(10);
		});

		it("clamps at boundaries", () => {
			expect(MathUtils.clamp(0, 0, 10)).toBe(0);
			expect(MathUtils.clamp(10, 0, 10)).toBe(10);
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
				expect(
					Math.abs(MathUtils.fastAtan2(y, x) - Math.atan2(y, x)),
				).toBeLessThan(0.01);
			});
		}
	});

	describe("isPowerOf2", () => {
		it("returns true for powers of two", () => {
			expect(MathUtils.isPowerOf2(1)).toBe(true);
			expect(MathUtils.isPowerOf2(2)).toBe(true);
			expect(MathUtils.isPowerOf2(4)).toBe(true);
			expect(MathUtils.isPowerOf2(1024)).toBe(true);
		});

		it("returns false for non-powers", () => {
			expect(MathUtils.isPowerOf2(0)).toBe(false);
			expect(MathUtils.isPowerOf2(3)).toBe(false);
			expect(MathUtils.isPowerOf2(6)).toBe(false);
		});
	});

	describe("nextPowerOf2", () => {
		it("returns next power of two", () => {
			expect(MathUtils.nextPowerOf2(1)).toBe(1);
			expect(MathUtils.nextPowerOf2(2)).toBe(2);
			expect(MathUtils.nextPowerOf2(3)).toBe(4);
			expect(MathUtils.nextPowerOf2(5)).toBe(8);
			expect(MathUtils.nextPowerOf2(100)).toBe(128);
		});
	});

	describe("packHsl16 / unpackHsl16", () => {
		it("round-trips HSL values", () => {
			const cases = [
				[0, 0, 0],
				[1, 1, 1],
				[0.5, 0.5, 0.5],
				[0.25, 0.75, 0.125],
			];
			for (const [h, s, l] of cases) {
				const packed = MathUtils.packHsl16(h, s, l);
				const unpacked = MathUtils.unpackHsl16(packed);
				// precision limited by bit depth: hue 6-bit, sat 3-bit, lightness 7-bit
				expect(Math.abs(unpacked.h - h)).toBeLessThan(1 / 63 + 0.01);
				expect(Math.abs(unpacked.s - s)).toBeLessThan(1 / 7 + 0.01);
				expect(Math.abs(unpacked.l - l)).toBeLessThan(1 / 127 + 0.01);
			}
		});
	});

	describe("tileDistance", () => {
		it("computes Manhattan distance", () => {
			expect(MathUtils.tileDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
			expect(MathUtils.tileDistance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
			expect(MathUtils.tileDistance({ x: -1, y: -1 }, { x: 1, y: 1 })).toBe(4);
		});
	});
});
