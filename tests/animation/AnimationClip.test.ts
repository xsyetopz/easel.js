import { describe, expect, it } from "bun:test";
import { AnimationClip } from "@/animation/AnimationClip.js";
import { NumberTrack } from "@/animation/tracks/NumberTrack.js";

describe("AnimationClip", () => {
	it("stores name, duration, and tracks", () => {
		const clip = new AnimationClip("run", 2, []);
		expect(clip.name).toBe("run");
		expect(clip.duration).toBe(2);
		expect(clip.tracks).toEqual([]);
	});

	it("auto-computes duration from tracks when -1", () => {
		const track = new NumberTrack("x", [0, 0.5, 1.5], [0, 5, 10]);
		const clip = new AnimationClip("walk", -1, [track]);
		expect(clip.duration).toBeCloseTo(1.5);
	});

	it("auto-computes max across multiple tracks", () => {
		const t1 = new NumberTrack("x", [0, 1], [0, 1]);
		const t2 = new NumberTrack("y", [0, 3], [0, 1]);
		const clip = new AnimationClip("anim", -1, [t1, t2]);
		expect(clip.duration).toBeCloseTo(3);
	});

	it("findByName returns matching clip", () => {
		const a = new AnimationClip("run", 1, []);
		const b = new AnimationClip("walk", 2, []);
		expect(AnimationClip.findByName([a, b], "walk")).toBe(b);
	});

	it("findByName returns undefined when not found", () => {
		const a = new AnimationClip("run", 1, []);
		expect(AnimationClip.findByName([a], "jump")).toBeUndefined();
	});

	it("duration 0 for empty tracks when auto-computed", () => {
		const clip = new AnimationClip("empty", -1, []);
		expect(clip.duration).toBe(0);
	});
});
