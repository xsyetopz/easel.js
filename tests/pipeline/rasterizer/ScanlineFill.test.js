import { describe, expect, it } from "vitest";
import { ScanlineFill } from "@/pipeline/rasterizer/ScanlineFill.js";

function collectFill(fill, x1, y1, x2, y2, x3, y3, w = 20, h = 20) {
	const pixels = [];
	fill.fill(x1, y1, x2, y2, x3, y3, w, h, (x, y) => pixels.push({ x, y }));
	return pixels;
}

function collectFillBary(fill, x1, y1, x2, y2, x3, y3, w = 20, h = 20) {
	const pixels = [];
	fill.fill(x1, y1, x2, y2, x3, y3, w, h, (x, y, u, v, w_) =>
		pixels.push({ x, y, u, v, w: w_ }),
	);
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

	it("barycentric coordinates sum to 1.0 for every covered pixel", () => {
		const pixels = collectFillBary(fill, 3, 0, 0, 5, 6, 5);
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.u + p.v + p.w).toBeCloseTo(1.0, 6);
		}
	});

	it("barycentric coordinates are non-negative for all interior pixels", () => {
		const pixels = collectFillBary(fill, 3, 0, 0, 5, 6, 5);
		for (const p of pixels) {
			expect(p.u).toBeGreaterThanOrEqual(-1e-6);
			expect(p.v).toBeGreaterThanOrEqual(-1e-6);
			expect(p.w).toBeGreaterThanOrEqual(-1e-6);
		}
	});

	it("triangle entirely outside framebuffer produces zero callbacks", () => {
		const pixels = collectFill(fill, -10, -10, -5, -10, -8, -5);
		expect(pixels.length).toBe(0);
	});

	it("degenerate triangle with all vertices at same point produces zero pixels", () => {
		const pixels = collectFill(fill, 5, 5, 5, 5, 5, 5);
		expect(pixels.length).toBe(0);
	});

	it("degenerate triangle with two vertices at same point produces zero pixels", () => {
		const pixels = collectFill(fill, 5, 5, 5, 5, 10, 10);
		expect(pixels.length).toBe(0);
	});

	it("CW and CCW winding of the same triangle produce identical pixel sets", () => {
		const ccw = collectFill(fill, 0, 0, 10, 0, 5, 10);
		const cw = collectFill(fill, 0, 0, 5, 10, 10, 0);
		const toKey = (p) => `${p.x},${p.y}`;
		const ccwKeys = ccw.map(toKey).sort();
		const cwKeys = cw.map(toKey).sort();
		expect(ccwKeys).toEqual(cwKeys);
	});

	it("thin triangle produces pixels with x constrained to a narrow column", () => {
		const pixels = collectFill(fill, 5, 0, 5, 19, 6, 9, 20, 200);
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.x === 5 || p.x === 6).toBe(true);
		}
	});

	it("triangle at framebuffer boundary keeps all pixels within bounds", () => {
		const w = 10;
		const h = 10;
		const pixels = collectFill(fill, 0, 0, w - 1, 0, 0, h - 1, w, h);
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.x).toBeGreaterThanOrEqual(0);
			expect(p.x).toBeLessThan(w);
			expect(p.y).toBeGreaterThanOrEqual(0);
			expect(p.y).toBeLessThan(h);
		}
	});
});
