import { describe, expect, it } from "bun:test";
import {
  AnimationClip,
  animationClipFromJson,
  findAnimationClip,
} from "@/animation/AnimationClip.js";
import { NumberTrack } from "@/animation/tracks/NumberTrack.js";
import { StringTrack } from "@/animation/tracks/StringTrack.js";

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
    expect(findAnimationClip([a, b], "walk")).toBe(b);
  });

  it("findByName returns undefined when not found", () => {
    const a = new AnimationClip("run", 1, []);
    expect(findAnimationClip([a], "jump")).toBeUndefined();
  });

  it("duration 0 for empty tracks when auto-computed", () => {
    const clip = new AnimationClip("empty", -1, []);
    expect(clip.duration).toBe(0);
  });

  it("validates finite ordered track storage", () => {
    const clip = new AnimationClip("valid", -1, [
      new NumberTrack("x", [0, 1], [2, 3]),
    ]);
    expect(clip.validate()).toBe(true);
  });

  it("clones track storage independently", () => {
    const clip = new AnimationClip("clone", -1, [
      new NumberTrack("x", [0, 1], [2, 3]),
    ]);
    const clone = clip.clone();
    expect(clone).not.toBe(clip);
    expect(clone.tracks[0]).not.toBe(clip.tracks[0]);
    expect(clone.tracks[0].values).toEqual(clip.tracks[0].values);
  });

  it("returns this from explicit mutating operations", () => {
    const clip = new AnimationClip("chain", 1, [
      new NumberTrack("x", [0, 1], [2, 3]),
    ]);
    expect(clip.resetDuration()).toBe(clip);
    expect(clip.trim()).toBe(clip);
    expect(clip.optimize()).toBe(clip);
  });

  it("round-trips canonical numeric and discrete track JSON", () => {
    const clip = new AnimationClip("json", -1, [
      new NumberTrack("x", [0, 1], [2, 3]),
      new StringTrack("state", [0, 1], ["idle", "run"]),
    ]);
    const restored = animationClipFromJson(clip.toJSON());
    expect(restored.name).toBe("json");
    expect(restored.duration).toBe(1);
    expect(restored.tracks[0]).toBeInstanceOf(NumberTrack);
    expect(restored.tracks[1]).toBeInstanceOf(StringTrack);
    expect(restored.toJSON()).toEqual(clip.toJSON());
  });
});
