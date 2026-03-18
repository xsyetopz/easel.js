import { describe, expect, it } from "vitest";
import { Framebuffer } from "@/pipeline/framebuffer/Framebuffer.js";
import { PixelWriter } from "@/pipeline/PixelWriter.js";

describe("PixelWriter", () => {
	const writer = new PixelWriter();

	it("a=255: writes pixel directly", () => {
		const fb = new Framebuffer(4, 4);
		writer.write(fb, 1, 1, 200, 100, 50, 255);
		const px = fb.getPixel(1, 1);
		expect(px.r).toBe(200);
		expect(px.g).toBe(100);
		expect(px.b).toBe(50);
	});

	it("a=0: skips write, pixel unchanged", () => {
		const fb = new Framebuffer(4, 4);
		fb.setPixel(2, 2, 10, 20, 30, 255);
		writer.write(fb, 2, 2, 255, 255, 255, 0);
		const px = fb.getPixel(2, 2);
		expect(px.r).toBe(10);
		expect(px.g).toBe(20);
		expect(px.b).toBe(30);
	});

	it("a=128: blends with existing pixel", () => {
		const fb = new Framebuffer(4, 4);
		fb.setPixel(0, 0, 0, 0, 0, 255);
		writer.write(fb, 0, 0, 200, 200, 200, 128);
		const px = fb.getPixel(0, 0);
		expect(px.r).toBeGreaterThan(50);
		expect(px.r).toBeLessThan(200);
	});

	it("a=128 blend result is midpoint between src and dst", () => {
		const fb = new Framebuffer(4, 4);
		fb.setPixel(0, 0, 0, 0, 0, 255);
		writer.write(fb, 0, 0, 100, 100, 100, 128);
		const px = fb.getPixel(0, 0);
		expect(px.r).toBeCloseTo(50, 0);
	});

	it("negative a: skips write", () => {
		const fb = new Framebuffer(4, 4);
		fb.setPixel(1, 1, 42, 42, 42, 255);
		writer.write(fb, 1, 1, 0, 0, 0, -1);
		expect(fb.getPixel(1, 1).r).toBe(42);
	});
});
