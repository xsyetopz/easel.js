import { describe, expect, it } from "bun:test";
import { Track } from "@/animation/Track.js";

describe("Track", () => {
	it("stores name, times, values, itemSize", () => {
		const t = new Track("position.x", [0, 1], [0, 10], 1);
		expect(t.name).toBe("position.x");
		expect(t.times).toBeInstanceOf(Float32Array);
		expect(t.values).toBeInstanceOf(Float32Array);
		expect(t.itemSize).toBe(1);
	});

	it("accepts plain arrays and converts to Float32Array", () => {
		const t = new Track("x", [0, 1], [5, 10]);
		expect(t.times).toBeInstanceOf(Float32Array);
		expect(t.values).toBeInstanceOf(Float32Array);
	});

	it("getValueAtTime at first keyframe returns first value", () => {
		const t = new Track("x", [0, 1, 2], [0, 10, 20]);
		expect(t.getValueAtTime(0)[0]).toBeCloseTo(0);
	});

	it("getValueAtTime at last keyframe returns last value", () => {
		const t = new Track("x", [0, 1, 2], [0, 10, 20]);
		expect(t.getValueAtTime(2)[0]).toBeCloseTo(20);
	});

	it("getValueAtTime before first keyframe clamps to first value", () => {
		const t = new Track("x", [1, 2], [5, 10]);
		expect(t.getValueAtTime(0)[0]).toBeCloseTo(5);
	});

	it("getValueAtTime after last keyframe clamps to last value", () => {
		const t = new Track("x", [0, 1], [0, 10]);
		expect(t.getValueAtTime(5)[0]).toBeCloseTo(10);
	});

	it("getValueAtTime midpoint linearly interpolates", () => {
		const t = new Track("x", [0, 1], [0, 10]);
		expect(t.getValueAtTime(0.5)[0]).toBeCloseTo(5);
	});

	it("returns array of length itemSize", () => {
		const t = new Track("pos", [0, 1], [0, 0, 0, 1, 2, 3], 3);
		const v = t.getValueAtTime(0.5);
		expect(v).toHaveLength(3);
		expect(v[0]).toBeCloseTo(0.5);
		expect(v[1]).toBeCloseTo(1);
		expect(v[2]).toBeCloseTo(1.5);
	});

	it("getValueAtTime with single keyframe always returns that value", () => {
		const t = new Track("x", [0.5], [42]);
		expect(t.getValueAtTime(0)[0]).toBeCloseTo(42);
		expect(t.getValueAtTime(1)[0]).toBeCloseTo(42);
	});
});
