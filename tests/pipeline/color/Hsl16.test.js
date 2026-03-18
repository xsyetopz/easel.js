import { describe, expect, it } from "vitest";
import { Hsl16 } from "@/pipeline/color/Hsl16.js";

describe("Hsl16", () => {
	it("BLACK constant encodes to zero lightness", () => {
		const decoded = Hsl16.decode(Hsl16.BLACK);
		expect(decoded.l).toBeCloseTo(0, 2);
	});

	it("WHITE constant encodes to full lightness", () => {
		const decoded = Hsl16.decode(Hsl16.WHITE);
		expect(decoded.l).toBeCloseTo(1, 2);
	});

	it("round-trips h=0.5, s=0.5, l=0.5 within packing precision", () => {
		const packed = Hsl16.encode(0.5, 0.5, 0.5);
		const { h, s, l } = Hsl16.decode(packed);
		// h: 6-bit (1/63 ≈ 0.016), s: 3-bit (1/7 ≈ 0.14), l: 7-bit (1/127 ≈ 0.008)
		expect(Math.abs(h - 0.5)).toBeLessThan(0.02);
		expect(Math.abs(s - 0.5)).toBeLessThan(0.15);
		expect(Math.abs(l - 0.5)).toBeLessThan(0.01);
	});

	it("round-trips boundary h=0, s=0, l=0", () => {
		const packed = Hsl16.encode(0, 0, 0);
		const { h, s, l } = Hsl16.decode(packed);
		expect(h).toBeCloseTo(0, 2);
		expect(s).toBeCloseTo(0, 2);
		expect(l).toBeCloseTo(0, 2);
	});

	it("round-trips boundary h=1, s=1, l=1", () => {
		const packed = Hsl16.encode(1, 1, 1);
		const { l } = Hsl16.decode(packed);
		expect(l).toBeCloseTo(1, 2);
	});

	it("encode returns a number", () => {
		expect(typeof Hsl16.encode(0.1, 0.2, 0.3)).toBe("number");
	});

	it("BLACK and WHITE are different values", () => {
		expect(Hsl16.BLACK).not.toBe(Hsl16.WHITE);
	});
});
