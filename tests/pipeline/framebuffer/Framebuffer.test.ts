import { describe, expect, it } from "vitest";
import { Framebuffer } from "@/pipeline/framebuffer/Framebuffer.js";

describe("Framebuffer", () => {
	it("constructor creates correct size", () => {
		const fb = new Framebuffer(10, 20);
		expect(fb.width).toBe(10);
		expect(fb.height).toBe(20);
	});

	it("data length equals width * height * 4", () => {
		const fb = new Framebuffer(4, 4);
		expect(fb.data.length).toBe(4 * 4 * 4);
	});

	it("setPixel/getPixel round-trip", () => {
		const fb = new Framebuffer(10, 10);
		fb.setPixel(3, 5, 100, 150, 200, 255);
		const px = fb.getPixel(3, 5);
		expect(px.r).toBe(100);
		expect(px.g).toBe(150);
		expect(px.b).toBe(200);
		expect(px.a).toBe(255);
	});

	it("default alpha is 255 when not provided", () => {
		const fb = new Framebuffer(10, 10);
		fb.setPixel(0, 0, 1, 2, 3);
		expect(fb.getPixel(0, 0).a).toBe(255);
	});

	it("resize updates width and height", () => {
		const fb = new Framebuffer(10, 10);
		fb.resize(20, 30);
		expect(fb.width).toBe(20);
		expect(fb.height).toBe(30);
	});

	it("resize creates new buffer of correct size", () => {
		const fb = new Framebuffer(10, 10);
		fb.resize(5, 8);
		expect(fb.data.length).toBe(5 * 8 * 4);
	});

	it("imageData exposes width and height", () => {
		const fb = new Framebuffer(6, 7);
		expect(fb.imageData.width).toBe(6);
		expect(fb.imageData.height).toBe(7);
	});
});
