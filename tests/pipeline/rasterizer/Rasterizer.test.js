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
		0,
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
});
