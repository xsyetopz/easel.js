import { describe, expect, it, vi } from "vitest";
import { Framebuffer } from "@/pipeline/framebuffer/Framebuffer.js";
import { Rasterizer } from "@/pipeline/rasterizer/Rasterizer.js";

function makeDrawCall(opts = {}) {
	return {
		triangles: [
			{
				screenVerts: [
					{ x: 0, y: 0 },
					{ x: 5, y: 0 },
					{ x: 2, y: 5 },
				],
				ndcVerts: [
					{ x: -1, y: 1, z: 0 },
					{ x: 0, y: 1, z: 0 },
					{ x: -0.5, y: 0, z: 0 },
				],
			},
		],
		material: { wireframe: false, points: false, ...opts },
	};
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
		const drawCall = { triangles: [], material: {} };
		rasterizer.rasterize(drawCall, framebuffer, undefined, pixelWriter);
		expect(pixelWriter).not.toHaveBeenCalled();
	});
});
