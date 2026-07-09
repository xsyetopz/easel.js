import { describe, expect, it } from "bun:test";
import { Track } from "@/animation/Track.js";
import { QuaternionTrack } from "@/animation/tracks/QuaternionTrack.js";

describe("QuaternionTrack", () => {
	it("inherits from Track", () => {
		const t = new QuaternionTrack("rotation", [0], [0, 0, 0, 1]);
		expect(t).toBeInstanceOf(Track);
	});

	it("has itemSize=4", () => {
		const t = new QuaternionTrack("rotation", [0, 1], [0, 0, 0, 1, 0, 0, 0, 1]);
		expect(t.itemSize).toBe(4);
	});

	it("at keyframe time returns exact quaternion", () => {
		const t = new QuaternionTrack("q", [0, 1], [0, 0, 0, 1, 1, 0, 0, 0]);
		const v = t.getValueAtTime(0);
		expect(v[0]).toBeCloseTo(0);
		expect(v[3]).toBeCloseTo(1);
	});

	it("clamps before first key", () => {
		const t = new QuaternionTrack("q", [1, 2], [0, 0, 0, 1, 0, 0, 0, 1]);
		const v = t.getValueAtTime(0);
		expect(v[3]).toBeCloseTo(1);
	});

	it("slerp result is unit quaternion at midpoint between identical quats", () => {
		// identity slerped with itself should remain identity
		const t = new QuaternionTrack("q", [0, 1], [0, 0, 0, 1, 0, 0, 0, 1]);
		const v = t.getValueAtTime(0.5);
		const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2 + v[3] ** 2);
		expect(len).toBeCloseTo(1);
	});

	it("slerp midpoint between two valid unit quaternions is unit length", () => {
		// 180-degree rotation around Z vs identity
		const t = new QuaternionTrack("q", [0, 1], [0, 0, 1, 0, 0, 0, 0, 1]);
		const v = t.getValueAtTime(0.5);
		const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2 + v[3] ** 2);
		expect(len).toBeCloseTo(1);
	});
});
