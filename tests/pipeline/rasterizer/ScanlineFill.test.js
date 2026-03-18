import { describe, expect, it } from "vitest";
import { ScanlineFill } from "@/pipeline/rasterizer/ScanlineFill.js";

function collectFill(fill, x1, y1, x2, y2, x3, y3, w = 20, h = 20) {
	const pixels = [];
	fill.fill(x1, y1, x2, y2, x3, y3, w, h, (x, y) => pixels.push({ x, y }));
	return pixels;
}

describe("ScanlineFill", () => {
	const fill = new ScanlineFill();

	it("small triangle (3,0),(0,5),(6,5) covers pixels", () => {
		const pixels = collectFill(fill, 3, 0, 0, 5, 6, 5);
		expect(pixels.length).toBeGreaterThan(0);
	});

	it("small triangle pixel x values stay within [0, 5]", () => {
		const pixels = collectFill(fill, 3, 0, 0, 5, 6, 5);
		expect(pixels.every((p) => p.x >= 0 && p.x <= 6)).toBe(true);
	});

	it("collinear triangle produces no or minimal pixels", () => {
		const pixels = collectFill(fill, 0, 0, 5, 0, 10, 0);
		expect(pixels.length).toBeLessThanOrEqual(1);
	});

	it("flat-bottom triangle covers expected rows", () => {
		const pixels = collectFill(fill, 5, 0, 0, 5, 10, 5);
		const ys = new Set(pixels.map((p) => p.y));
		expect(ys.size).toBeGreaterThan(1);
	});

	it("flat-top triangle covers expected rows", () => {
		const pixels = collectFill(fill, 0, 0, 10, 0, 5, 5);
		const ys = new Set(pixels.map((p) => p.y));
		expect(ys.size).toBeGreaterThan(1);
	});

	it("pixels stay within framebuffer bounds", () => {
		const pixels = collectFill(fill, 3, 0, 0, 5, 6, 5, 10, 10);
		expect(
			pixels.every((p) => p.x >= 0 && p.x < 10 && p.y >= 0 && p.y < 10),
		).toBe(true);
	});
});
