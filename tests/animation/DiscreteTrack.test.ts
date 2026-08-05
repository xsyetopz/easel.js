import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { AnimationClip } from "@/animation/AnimationClip.js";
import { makeClipAdditive, subclip } from "@/animation/AnimationUtils.js";
import { Animator } from "@/animation/Animator.js";
import { Binding } from "@/animation/Binding.js";
import { PropertyMixer } from "@/animation/PropertyMixer.js";
import { Interpolation } from "@/animation/Track.js";
import { BooleanTrack } from "@/animation/tracks/BooleanTrack.js";
import { StringTrack } from "@/animation/tracks/StringTrack.js";
import { AnimationLoader } from "@/loaders/AnimationLoader.js";

describe("discrete animation tracks", () => {
  it("stores booleans without numeric encoding", () => {
    const track = new BooleanTrack("visible", [0, 1], [true, false]);
    expect(track.values).toEqual([true, false]);
    expect(track.valueType).toBe("boolean");
    expect(track.interpolation).toBe(Interpolation.Discrete);
    expect(track.getValueAtTime(0.75)).toEqual([true]);
    expect(track.getValueAtTime(1)).toEqual([false]);
  });

  it("matches locked THREE.js string sampling", () => {
    const times = [0, 1, 2];
    const values = ["idle", "walk", "run"];
    const track = new StringTrack("state", times, values);
    const StringKeyframeTrack = (
      THREE as unknown as {
        StringKeyframeTrack: new (
          name: string,
          times: number[],
          values: string[],
        ) => { createInterpolant(): { evaluate(time: number): string[] } };
      }
    ).StringKeyframeTrack;
    const reference = new StringKeyframeTrack("state", times, values);
    const interpolant = reference.createInterpolant();

    for (const time of [-1, 0, 0.75, 1, 1.75, 2, 3]) {
      expect(track.getValueAtTime(time)[0]).toBe(interpolant.evaluate(time)[0]);
    }
  });

  it("copies and freezes caller-owned discrete values", () => {
    const source = ["idle", "run"];
    const track = new StringTrack("state", [0, 1], source);
    source[0] = "changed";
    expect(track.values).toEqual(["idle", "run"]);
    expect(Object.isFrozen(track.values)).toBe(true);
  });

  it("returns immutable transformed discrete tracks", () => {
    const track = new StringTrack("state", [0, 1, 2], ["idle", "idle", "run"]);
    expect(Array.from(track.shift(2).times)).toEqual([2, 3, 4]);
    expect(Array.from(track.scale(2).times)).toEqual([0, 2, 4]);
    expect(track.trim(1, 2).values).toEqual(["idle", "run"]);
    expect(track.optimize().values).toEqual(["idle", "run"]);
    expect(track.values).toEqual(["idle", "idle", "run"]);
    expect(track.clone()).not.toBe(track);
    expect(track.validate()).toBe(true);
  });

  it("rejects malformed discrete keyframes and value types", () => {
    expect(() => new StringTrack("state", [0, 1], ["idle"])).toThrow(
      "values length",
    );
    expect(() => new BooleanTrack("visible", [1, 0], [true, false])).toThrow(
      "strictly increasing",
    );
    expect(
      () =>
        new StringTrack("state", [0], [false] as unknown as readonly string[]),
    ).toThrow("type string");
  });

  it("selects discrete mixer values by cumulative weight", () => {
    const target = { state: "original" };
    const mixer = new PropertyMixer(
      new Binding(target, "state").bind(),
      1,
      "string",
    );
    mixer.saveOriginalState();
    mixer.accumulate(0, 0.25, ["first"]);
    mixer.accumulate(0, 0.75, ["second"]);
    mixer.apply(0);
    expect(target.state).toBe("second");
  });

  it("applies string and boolean tracks through Animator", () => {
    const target = { state: "idle", visible: true };
    const clip = new AnimationClip("state", 2, [
      new StringTrack("state", [0, 1], ["idle", "run"]),
      new BooleanTrack("visible", [0, 1], [true, false]),
    ]);
    const animator = new Animator(target);
    animator.clipAction(clip).play();
    animator.update(1);
    expect(target).toEqual({ state: "run", visible: false });
  });

  it("subclips and optimizes discrete tracks without coercion", () => {
    const source = new AnimationClip("source", 3, [
      new StringTrack("state", [0, 1, 2, 3], ["idle", "walk", "walk", "run"]),
    ]);
    const clipped = subclip(source, "part", 1, 3, 1);
    expect(Array.from(clipped.tracks[0].times)).toEqual([0, 1, 2]);
    expect(clipped.tracks[0].values).toEqual(["walk", "walk", "run"]);
    clipped.optimize();
    expect(Array.from(clipped.tracks[0].times)).toEqual([0, 2]);
    expect(clipped.tracks[0].values).toEqual(["walk", "run"]);
  });

  it("leaves discrete tracks unchanged when making a clip additive", () => {
    const track = new StringTrack("state", [0, 1], ["idle", "run"]);
    const clip = new AnimationClip("state", 1, [track]);
    makeClipAdditive(clip);
    expect(track.values).toEqual(["idle", "run"]);
  });

  it("parses canonical boolean and string track data", () => {
    const [clip] = new AnimationLoader().parse([
      {
        name: "state",
        tracks: [
          {
            type: "string",
            name: "state",
            times: [0, 1],
            values: ["idle", "run"],
          },
          {
            type: "boolean",
            name: "visible",
            times: [0, 1],
            values: [true, false],
          },
        ],
      },
    ]);
    expect(clip.tracks[0]).toBeInstanceOf(StringTrack);
    expect(clip.tracks[1]).toBeInstanceOf(BooleanTrack);
  });
});
