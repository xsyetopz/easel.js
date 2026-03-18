import { describe, expect, it } from "vitest";
import { Layers } from "@/core/Layers.js";

describe("Layers", () => {
	it("layer 0 is enabled by default", () => {
		const layers = new Layers();
		expect(layers.test(new Layers())).toBe(true);
	});

	it("enable sets a layer bit", () => {
		const layers = new Layers();
		layers.enable(1);
		const other = new Layers();
		other.enable(1);
		expect(layers.test(other)).toBe(true);
	});

	it("disable clears a layer bit", () => {
		const layers = new Layers();
		layers.enable(1);
		layers.disable(1);
		layers.disable(0);
		const other = new Layers();
		other.enable(1);
		expect(layers.test(other)).toBe(false);
	});

	it("toggle flips a layer bit", () => {
		const layers = new Layers();
		layers.disable(0);
		layers.toggle(2);
		const other = new Layers();
		other.disable(0);
		other.enable(2);
		expect(layers.test(other)).toBe(true);
		layers.toggle(2);
		expect(layers.test(other)).toBe(false);
	});

	it("set assigns a single layer bit", () => {
		const layers = new Layers();
		layers.set(0);
		expect(layers.mask).toBe(1);
		layers.set(2);
		expect(layers.mask).toBe(1 << 2);
	});

	it("test returns false when no bits overlap", () => {
		const a = new Layers();
		a.disable(0);
		a.enable(1);
		const b = new Layers();
		b.disable(0);
		b.enable(2);
		expect(a.test(b)).toBe(false);
	});
});
