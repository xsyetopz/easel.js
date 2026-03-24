import { describe, expect, it } from "vitest";
import { TextureClamp } from "@/pipeline/texture/TextureClamp.ts";

describe("TextureClamp", () => {
	const clamp = new TextureClamp();

	it("UV (0.5, 0.5) maps to center texel of 10x10 texture", () => {
		const { x, y } = clamp.clamp(0.5, 0.5, 10, 10);
		expect(x).toBe(4);
		expect(y).toBe(4);
	});

	it("UV (0, 0) maps to (0, 0)", () => {
		const { x, y } = clamp.clamp(0, 0, 8, 8);
		expect(x).toBe(0);
		expect(y).toBe(0);
	});

	it("UV (1, 1) maps to (texWidth-1, texHeight-1)", () => {
		const { x, y } = clamp.clamp(1, 1, 8, 8);
		expect(x).toBe(7);
		expect(y).toBe(7);
	});

	it("UV negative u is clamped to 0", () => {
		const { x } = clamp.clamp(-0.5, 0.5, 10, 10);
		expect(x).toBe(0);
	});

	it("UV u > 1 is clamped to texWidth-1", () => {
		const { x } = clamp.clamp(1.5, 0.5, 10, 10);
		expect(x).toBe(9);
	});

	it("UV negative v is clamped to 0", () => {
		const { y } = clamp.clamp(0.5, -0.1, 10, 10);
		expect(y).toBe(0);
	});

	it("UV v > 1 is clamped to texHeight-1", () => {
		const { y } = clamp.clamp(0.5, 1.5, 10, 10);
		expect(y).toBe(9);
	});
});
