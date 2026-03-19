import { describe, expect, it, vi } from "vitest";
import { Framebuffer } from "@/pipeline/framebuffer/Framebuffer.js";
import { Rasterizer } from "@/pipeline/rasterizer/Rasterizer.js";
import { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";

function makeDrawCall(opts = {}) {
	const tb = new TriangleBuffer(1);
	tb.append(
		0,
		0,
		5,
		0,
		2,
		5,
		0,
		0,
		-1,
		0,
		0,
		-1,
		0,
		0,
		-1,
		0,
		0,
		-1,
		0,
		0,
		-1,
		0,
		0,
		0,
		0,
		0,
		0,
	);
	tb.buildSortOrder();
	return {
		triangles: tb,
		material: { wireframe: false, points: false, ...opts },
	};
}

function makeEmptyDrawCall() {
	const tb = new TriangleBuffer(1);
	tb.buildSortOrder();
	return { triangles: tb, material: {} };
}

/**
 * Appends a triangle covering pixel (10,7) of a 20x20 framebuffer.
 * Screen coords (8,5),(12,5),(10,10).
 * @param {TriangleBuffer} tb
 * @param {number} z NDC Z for all three vertices
 * @param {number} u0 @param {number} v0 UV vertex 0
 * @param {number} u1 @param {number} v1 UV vertex 1
 * @param {number} u2 @param {number} v2 UV vertex 2
 */
function appendCenterTriangle(
	tb,
	z,
	u0 = 0,
	v0 = 0,
	u1 = 0,
	v1 = 0,
	u2 = 0,
	v2 = 0,
) {
	tb.append(
		8,
		5,
		12,
		5,
		10,
		10,
		z,
		z,
		z,
		0,
		0,
		-1,
		0,
		0,
		-1,
		0,
		0,
		-1,
		0,
		0,
		-1,
		u0,
		v0,
		u1,
		v1,
		u2,
		v2,
	);
}

describe("Rasterizer", () => {
	const framebuffer = new Framebuffer(20, 20);

	it("calls pixelWriter for solid material", () => {
		const rasterizer = new Rasterizer();
		const pixelWriter = vi.fn();
		rasterizer.rasterize(makeDrawCall(), framebuffer, undefined, pixelWriter);
		expect(pixelWriter).toHaveBeenCalled();
	});

	it("calls pixelWriter for wireframe material", () => {
		const rasterizer = new Rasterizer();
		const pixelWriter = vi.fn();
		rasterizer.rasterize(
			makeDrawCall({ wireframe: true }),
			framebuffer,
			undefined,
			pixelWriter,
		);
		expect(pixelWriter).toHaveBeenCalled();
	});

	it("calls pixelWriter for points material", () => {
		const rasterizer = new Rasterizer();
		const pixelWriter = vi.fn();
		rasterizer.rasterize(
			makeDrawCall({ points: true, pointRadius: 1 }),
			framebuffer,
			undefined,
			pixelWriter,
		);
		expect(pixelWriter).toHaveBeenCalled();
	});

	it("does not call pixelWriter for empty triangles array", () => {
		const rasterizer = new Rasterizer();
		const pixelWriter = vi.fn();
		rasterizer.rasterize(
			makeEmptyDrawCall(),
			framebuffer,
			undefined,
			pixelWriter,
		);
		expect(pixelWriter).not.toHaveBeenCalled();
	});

	it("flat shading: shadedColors plain object multiplies base material color", () => {
		const rasterizer = new Rasterizer();
		const pixels = [];
		const fb = new Framebuffer(20, 20);
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.buildSortOrder();
		const drawCall = {
			triangles: tb,
			material: { color: { r: 1, g: 1, b: 1 } },
			shadedColors: [{ r: 0.5, g: 0.5, b: 0.5 }],
		};
		rasterizer.rasterize(drawCall, fb, undefined, (_x, _y, r, g, b) => {
			pixels.push({ r, g, b });
		});
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.r).toBeGreaterThanOrEqual(127);
			expect(p.r).toBeLessThanOrEqual(128);
			expect(p.g).toBeGreaterThanOrEqual(127);
			expect(p.g).toBeLessThanOrEqual(128);
			expect(p.b).toBeGreaterThanOrEqual(127);
			expect(p.b).toBeLessThanOrEqual(128);
		}
	});

	it("gouraud shading: shadedColors array produces varying pixel colors across triangle", () => {
		const rasterizer = new Rasterizer();
		const pixels = [];
		const fb = new Framebuffer(20, 20);
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.buildSortOrder();
		const drawCall = {
			triangles: tb,
			material: { color: { r: 1, g: 1, b: 1 } },
			shadedColors: [
				[
					{ r: 1, g: 0, b: 0 },
					{ r: 0, g: 1, b: 0 },
					{ r: 0, g: 0, b: 1 },
				],
			],
		};
		rasterizer.rasterize(drawCall, fb, undefined, (_x, _y, r, g, b) => {
			pixels.push({ r, g, b });
		});
		expect(pixels.length).toBeGreaterThan(0);
		const unique = new Set(pixels.map((p) => `${p.r},${p.g},${p.b}`));
		expect(unique.size).toBeGreaterThan(1);
	});

	it("no shadedColors: uses base material color directly for all pixels", () => {
		const rasterizer = new Rasterizer();
		const pixels = [];
		const fb = new Framebuffer(20, 20);
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.buildSortOrder();
		const drawCall = {
			triangles: tb,
			material: { color: { r: 1, g: 0, b: 0 } },
		};
		rasterizer.rasterize(drawCall, fb, undefined, (_x, _y, r, g, b) => {
			pixels.push({ r, g, b });
		});
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.r).toBe(255);
			expect(p.g).toBe(0);
			expect(p.b).toBe(0);
		}
	});

	it("no shadedColors and no material.color: all pixels are white (255,255,255)", () => {
		const rasterizer = new Rasterizer();
		const pixels = [];
		const fb = new Framebuffer(20, 20);
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.buildSortOrder();
		const drawCall = { triangles: tb, material: {} };
		rasterizer.rasterize(drawCall, fb, undefined, (_x, _y, r, g, b) => {
			pixels.push({ r, g, b });
		});
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.r).toBe(255);
			expect(p.g).toBe(255);
			expect(p.b).toBe(255);
		}
	});

	it("closer triangle (lower ndcZ) overwrites farther triangle at same screen position", () => {
		const rasterizer = new Rasterizer();
		const fb = new Framebuffer(20, 20);

		const tbFar = new TriangleBuffer(1);
		appendCenterTriangle(tbFar, 0.5);
		tbFar.buildSortOrder();
		const farCall = {
			triangles: tbFar,
			material: { color: { r: 0, g: 0, b: 1 } },
		};

		const tbClose = new TriangleBuffer(1);
		appendCenterTriangle(tbClose, -0.5);
		tbClose.buildSortOrder();
		const closeCall = {
			triangles: tbClose,
			material: { color: { r: 1, g: 0, b: 0 } },
		};

		const writer = (x, y, r, g, b) => fb.setPixel(x, y, r, g, b);
		rasterizer.rasterize(farCall, fb, undefined, writer);
		rasterizer.rasterize(closeCall, fb, undefined, writer);

		const pixel = fb.getPixel(10, 7);
		expect(pixel.r).toBe(255);
		expect(pixel.b).toBe(0);
	});

	it("ndcZ=-1 (near plane): depth16=0 passes depth test on fresh framebuffer", () => {
		const rasterizer = new Rasterizer();
		const pixels = [];
		const fb = new Framebuffer(20, 20);
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.buildSortOrder();
		rasterizer.rasterize(
			{ triangles: tb, material: { color: { r: 1, g: 1, b: 1 } } },
			fb,
			undefined,
			(x, y) => pixels.push({ x, y }),
		);
		expect(pixels.length).toBeGreaterThan(0);
	});

	it("ndcZ=1 (far plane): depth16=65535 equals initial depth buffer value and passes", () => {
		const rasterizer = new Rasterizer();
		const pixels = [];
		const fb = new Framebuffer(20, 20);
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, 1);
		tb.buildSortOrder();
		rasterizer.rasterize(
			{ triangles: tb, material: { color: { r: 1, g: 1, b: 1 } } },
			fb,
			undefined,
			(x, y) => pixels.push({ x, y }),
		);
		expect(pixels.length).toBeGreaterThan(0);
	});

	it("textured triangle: pixels sampled from material.map rather than base color", () => {
		const rasterizer = new Rasterizer();
		const pixels = [];
		const fb = new Framebuffer(20, 20);
		const tb = new TriangleBuffer(1);
		const texData = new Uint8ClampedArray([
			255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
		]);
		appendCenterTriangle(tb, -1, 0, 0, 1, 0, 0.5, 1);
		tb.buildSortOrder();
		const drawCall = {
			triangles: tb,
			material: { map: { data: { data: texData, width: 2, height: 2 } } },
		};
		rasterizer.rasterize(drawCall, fb, undefined, (_x, _y, r, g, b) => {
			pixels.push({ r, g, b });
		});
		expect(pixels.length).toBeGreaterThan(0);
		const unique = new Set(pixels.map((p) => `${p.r},${p.g},${p.b}`));
		expect(unique.size).toBeGreaterThan(1);
	});

	it("UV (0,0) at all vertices samples top-left texel (red)", () => {
		const rasterizer = new Rasterizer();
		const pixels = [];
		const fb = new Framebuffer(20, 20);
		const tb = new TriangleBuffer(1);
		const texData = new Uint8ClampedArray([
			255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
		]);
		appendCenterTriangle(tb, -1, 0, 0, 0, 0, 0, 0);
		tb.buildSortOrder();
		const drawCall = {
			triangles: tb,
			material: { map: { data: { data: texData, width: 2, height: 2 } } },
		};
		rasterizer.rasterize(drawCall, fb, undefined, (_x, _y, r, g, b) => {
			pixels.push({ r, g, b });
		});
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.r).toBe(255);
			expect(p.g).toBe(0);
			expect(p.b).toBe(0);
		}
	});

	it("UV (1,1) at all vertices samples bottom-right texel (white)", () => {
		const rasterizer = new Rasterizer();
		const pixels = [];
		const fb = new Framebuffer(20, 20);
		const tb = new TriangleBuffer(1);
		const texData = new Uint8ClampedArray([
			255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
		]);
		appendCenterTriangle(tb, -1, 1, 1, 1, 1, 1, 1);
		tb.buildSortOrder();
		const drawCall = {
			triangles: tb,
			material: { map: { data: { data: texData, width: 2, height: 2 } } },
		};
		rasterizer.rasterize(drawCall, fb, undefined, (_x, _y, r, g, b) => {
			pixels.push({ r, g, b });
		});
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.r).toBe(255);
			expect(p.g).toBe(255);
			expect(p.b).toBe(255);
		}
	});

	it("sortOrder controls which physical triangle is read at each iteration position", () => {
		const rasterizer = new Rasterizer();
		const fb = new Framebuffer(20, 20);
		const tb = new TriangleBuffer(2);
		// physical 0: ndcZ=-0.9 (farther), physical 1: ndcZ=-1 (closest)
		appendCenterTriangle(tb, -0.9);
		appendCenterTriangle(tb, -1);
		// sortOrder[0]=1 → iteration 0 reads physIdx 1 (ndcZ=-1, closest): green
		// sortOrder[1]=0 → iteration 1 reads physIdx 0 (ndcZ=-0.9, farther): red (blocked by depth)
		tb.sortOrder = [1, 0];
		const drawCall = {
			triangles: tb,
			material: { color: { r: 1, g: 1, b: 1 } },
			shadedColors: [
				{ r: 0, g: 1, b: 0 }, // iteration 0 → physIdx 1 (ndcZ=-1): green
				{ r: 1, g: 0, b: 0 }, // iteration 1 → physIdx 0 (ndcZ=-0.9): red, blocked by depth
			],
		};
		rasterizer.rasterize(drawCall, fb, undefined, (x, y, r, g, b) => {
			fb.setPixel(x, y, r, g, b);
		});
		// Iteration 0 (physIdx 1, ndcZ=-1) wins depth; iteration 1 is farther and rejected
		const pixel = fb.getPixel(10, 7);
		expect(pixel.g).toBe(255);
		expect(pixel.r).toBe(0);
	});

	it("shadedColors[i] matches sort iteration position, not physical triangle index", () => {
		const rasterizer = new Rasterizer();
		const fb = new Framebuffer(20, 20);
		const tb = new TriangleBuffer(2);
		appendCenterTriangle(tb, -1);
		appendCenterTriangle(tb, -0.9);
		// iteration 0 → physIdx 1 (ndcZ=-0.9), iteration 1 → physIdx 0 (ndcZ=-1, closest)
		tb.sortOrder = [1, 0];
		const drawCall = {
			triangles: tb,
			material: { color: { r: 1, g: 1, b: 1 } },
			shadedColors: [
				{ r: 1, g: 0, b: 0 },
				{ r: 0, g: 0, b: 1 },
			],
		};
		rasterizer.rasterize(drawCall, fb, undefined, (x, y, r, g, b) => {
			fb.setPixel(x, y, r, g, b);
		});
		// physIdx 0 (ndcZ=-1) is closest and wins depth → shadedColors[1]=blue applies
		const pixel = fb.getPixel(10, 7);
		expect(pixel.b).toBe(255);
		expect(pixel.r).toBe(0);
	});

	it("drawCall with triangles=undefined does not crash and writes no pixels", () => {
		const rasterizer = new Rasterizer();
		const pixels = [];
		const fb = new Framebuffer(20, 20);
		expect(() => {
			rasterizer.rasterize(
				{ triangles: undefined, material: {} },
				fb,
				undefined,
				(x, y) => pixels.push({ x, y }),
			);
		}).not.toThrow();
		expect(pixels.length).toBe(0);
	});

	it("empty drawCall with material color writes no pixels", () => {
		const rasterizer = new Rasterizer();
		const pixels = [];
		const fb = new Framebuffer(20, 20);
		rasterizer.rasterize(makeEmptyDrawCall(), fb, undefined, (x, y) =>
			pixels.push({ x, y }),
		);
		expect(pixels.length).toBe(0);
	});
});
