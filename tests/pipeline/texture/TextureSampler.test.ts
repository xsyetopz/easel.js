import { describe, expect, it } from "bun:test";
import { TextureSampler } from "@/pipeline/texture/TextureSampler.ts";

function make2x2Texture(
	tl: number[],
	tr: number[],
	bl: number[],
	br: number[],
) {
	const data = new Uint8ClampedArray(2 * 2 * 4);
	function set(idx: number, [r, g, b, a]: number[]) {
		data[idx * 4] = r;
		data[idx * 4 + 1] = g;
		data[idx * 4 + 2] = b;
		data[idx * 4 + 3] = a;
	}
	set(0, tl);
	set(1, tr);
	set(2, bl);
	set(3, br);
	return { data, width: 2, height: 2 };
}

describe("TextureSampler", () => {
	const sampler = new TextureSampler();
	const tex = make2x2Texture(
		[255, 0, 0, 255],
		[0, 255, 0, 255],
		[0, 0, 255, 255],
		[255, 255, 0, 255],
	);

	it("UV (0,0) returns top-left texel (red)", () => {
		const px = sampler.sample(tex, 0, 0);
		expect(px.r).toBe(255);
		expect(px.g).toBe(0);
		expect(px.b).toBe(0);
	});

	it("UV (1,0) returns top-right texel (green)", () => {
		const px = sampler.sample(tex, 1, 0);
		expect(px.r).toBe(0);
		expect(px.g).toBe(255);
		expect(px.b).toBe(0);
	});

	it("UV (0,1) returns bottom-left texel (blue)", () => {
		const px = sampler.sample(tex, 0, 1);
		expect(px.r).toBe(0);
		expect(px.g).toBe(0);
		expect(px.b).toBe(255);
	});

	it("UV (1,1) returns bottom-right texel (yellow)", () => {
		const px = sampler.sample(tex, 1, 1);
		expect(px.r).toBe(255);
		expect(px.g).toBe(255);
		expect(px.b).toBe(0);
	});

	it("returns object with r,g,b,a fields", () => {
		const px = sampler.sample(tex, 0.5, 0.5);
		expect(px).toHaveProperty("r");
		expect(px).toHaveProperty("g");
		expect(px).toHaveProperty("b");
		expect(px).toHaveProperty("a");
	});
});
