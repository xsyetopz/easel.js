import { describe, expect, it } from "vitest";
import { Framebuffer } from "@/pipeline/framebuffer/Framebuffer.js";
import { FramebufferClear } from "@/pipeline/framebuffer/FramebufferClear.ts";

describe("FramebufferClear", () => {
	it("fills all pixels with given color", () => {
		const fb = new Framebuffer(4, 4);
		const clear = new FramebufferClear();
		clear.clear(fb, 10, 20, 30, 255);
		for (let y = 0; y < 4; y++) {
			for (let x = 0; x < 4; x++) {
				const px = fb.getPixel(x, y);
				expect(px.r).toBe(10);
				expect(px.g).toBe(20);
				expect(px.b).toBe(30);
				expect(px.a).toBe(255);
			}
		}
	});

	it("default fill is black (r=0,g=0,b=0,a=255)", () => {
		const fb = new Framebuffer(3, 3);
		fb.setPixel(1, 1, 255, 0, 0, 255);
		const clear = new FramebufferClear();
		clear.clear(fb);
		const px = fb.getPixel(1, 1);
		expect(px.r).toBe(0);
		expect(px.g).toBe(0);
		expect(px.b).toBe(0);
		expect(px.a).toBe(255);
	});

	it("1×1 framebuffer clear sets the single pixel correctly", () => {
		const fb = new Framebuffer(1, 1);
		const clear = new FramebufferClear();
		clear.clear(fb, 77, 88, 99, 255);
		const px = fb.getPixel(0, 0);
		expect(px.r).toBe(77);
		expect(px.g).toBe(88);
		expect(px.b).toBe(99);
		expect(px.a).toBe(255);
	});

	it("non-black clear with non-255 alpha sets pixel values correctly", () => {
		const fb = new Framebuffer(2, 2);
		const clear = new FramebufferClear();
		clear.clear(fb, 128, 64, 32, 128);
		for (let y = 0; y < 2; y++) {
			for (let x = 0; x < 2; x++) {
				const px = fb.getPixel(x, y);
				expect(px.r).toBe(128);
				expect(px.g).toBe(64);
				expect(px.b).toBe(32);
				expect(px.a).toBe(128);
			}
		}
	});

	it("second clear overwrites first clear", () => {
		const fb = new Framebuffer(2, 2);
		const clear = new FramebufferClear();
		clear.clear(fb, 255, 0, 0, 255);
		clear.clear(fb, 0, 0, 255, 255);
		for (let y = 0; y < 2; y++) {
			for (let x = 0; x < 2; x++) {
				const px = fb.getPixel(x, y);
				expect(px.r).toBe(0);
				expect(px.g).toBe(0);
				expect(px.b).toBe(255);
				expect(px.a).toBe(255);
			}
		}
	});
});
