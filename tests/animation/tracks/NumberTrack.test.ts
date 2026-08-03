import { describe, expect, it } from "bun:test";
import { Track } from "@/animation/Track.js";
import { NumberTrack } from "@/animation/tracks/NumberTrack.js";

describe("NumberTrack", () => {
  it("inherits from Track", () => {
    expect(new NumberTrack("x", [0], [1])).toBeInstanceOf(Track);
  });

  it("has itemSize=1", () => {
    const t = new NumberTrack("x", [0, 1], [0, 10]);
    expect(t.itemSize).toBe(1);
  });

  it("linearly interpolates between scalar values", () => {
    const t = new NumberTrack("scale", [0, 2], [0, 4]);
    expect(t.getValueAtTime(1)[0]).toBeCloseTo(2);
  });

  it("clamps below first keyframe", () => {
    const t = new NumberTrack("x", [1, 2], [5, 10]);
    expect(t.getValueAtTime(0)[0]).toBeCloseTo(5);
  });

  it("clamps above last keyframe", () => {
    const t = new NumberTrack("x", [0, 1], [5, 10]);
    expect(t.getValueAtTime(99)[0]).toBeCloseTo(10);
  });
});
