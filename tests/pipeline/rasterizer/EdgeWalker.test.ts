import { describe, expect, it } from "vitest";
import { EdgeWalker } from "@/pipeline/rasterizer/EdgeWalker.js";

function collect(walker, x1, y1, x2, y2) {
	const pixels: Array<{ x: number; y: number }> = [];
	walker.walk(x1, y1, x2, y2, (x, y) => pixels.push({ x, y }));
	return pixels;
}

describe("EdgeWalker", () => {
	const walker = new EdgeWalker();

	it("horizontal line: all pixels share the same y", () => {
		const pixels = collect(walker, 0, 5, 4, 5);
		expect(pixels.length).toBeGreaterThan(0);
		expect(pixels.every((p) => p.y === 5)).toBe(true);
	});

	it("vertical line: all pixels share the same x", () => {
		const pixels = collect(walker, 3, 0, 3, 4);
		expect(pixels.length).toBeGreaterThan(0);
		expect(pixels.every((p) => p.x === 3)).toBe(true);
	});

	it("diagonal line: pixel count equals max(|dx|,|dy|)+1", () => {
		const pixels = collect(walker, 0, 0, 4, 4);
		expect(pixels.length).toBe(5);
	});

	it("start equals end: produces exactly one pixel", () => {
		const pixels = collect(walker, 2, 3, 2, 3);
		expect(pixels.length).toBe(1);
		expect(pixels[0]).toEqual({ x: 2, y: 3 });
	});

	it("includes both endpoints", () => {
		const pixels = collect(walker, 1, 1, 3, 1);
		const xs = pixels.map((p) => p.x);
		expect(xs).toContain(1);
		expect(xs).toContain(3);
	});
});
