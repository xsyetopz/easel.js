import { describe, expect, it } from "bun:test";
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

	it("blend with non-black background: existing=(200,100,50), write (0,0,0,128)", () => {
		const fb = new Framebuffer(4, 4);
		fb.setPixel(3, 3, 200, 100, 50, 255);
		writer.write(fb, 3, 3, 0, 0, 0, 128);
		const px = fb.getPixel(3, 3);
		// blend = existing + (0 - existing) * (128/255) ≈ existing * 0.498
		expect(px.r).toBeCloseTo(200 * (1 - 128 / 255), 0);
		expect(px.g).toBeCloseTo(100 * (1 - 128 / 255), 0);
		expect(px.b).toBeCloseTo(50 * (1 - 128 / 255), 0);
	});

	it("a=254 uses blend path and result is very close to source color", () => {
		const fb = new Framebuffer(4, 4);
		// black background
		writer.write(fb, 0, 0, 200, 150, 100, 254);
		const px = fb.getPixel(0, 0);
		// blend = 0 + (src - 0) * (254/255) ≈ src * 0.996
		expect(px.r).toBeCloseTo(200 * (254 / 255), 0);
		expect(px.g).toBeCloseTo(150 * (254 / 255), 0);
		expect(px.b).toBeCloseTo(100 * (254 / 255), 0);
	});

	it("a=1 (near-transparent) blends to barely non-zero on black background", () => {
		const fb = new Framebuffer(4, 4);
		// black background (default)
		writer.write(fb, 2, 2, 255, 255, 255, 1);
		const px = fb.getPixel(2, 2);
		// blend = 0 + (255 - 0) * (1/255) = 1
		expect(px.r).toBeCloseTo(1, 0);
		expect(px.g).toBeCloseTo(1, 0);
		expect(px.b).toBeCloseTo(1, 0);
	});
});
