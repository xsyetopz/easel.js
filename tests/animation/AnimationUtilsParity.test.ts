import { describe, expect, it } from "bun:test";
import { createRequire } from "node:module";
import { AnimationBlend, AnimationClip } from "@/animation/AnimationClip.js";
import { makeClipAdditive, subclip } from "@/animation/AnimationUtils.js";
import { NumberTrack } from "@/animation/tracks/NumberTrack.js";
import { QuaternionTrack } from "@/animation/tracks/QuaternionTrack.js";

type THREEAnimationClip = {
  blendMode: number;
  tracks: Array<{ values: Float32Array }>;
};

type THREEAnimationModule = {
  AnimationClip: new (
    name: string,
    duration: number,
    tracks: Array<{ values: Float32Array }>,
  ) => THREEAnimationClip;
  AnimationUtils: {
    makeClipAdditive(
      clip: THREEAnimationClip,
      referenceFrame: number,
      referenceClip: THREEAnimationClip,
      fps: number,
    ): THREEAnimationClip;
  };
  NumberKeyframeTrack: new (
    name: string,
    times: number[],
    values: number[],
  ) => { values: Float32Array };
  QuaternionKeyframeTrack: new (
    name: string,
    times: number[],
    values: number[],
  ) => { values: Float32Array };
};

const require = createRequire(import.meta.url);
const {
  AnimationClip: THREEAnimationClipConstructor,
  AnimationUtils: THREEAnimationUtils,
  NumberKeyframeTrack,
  QuaternionKeyframeTrack,
} = require("three") as THREEAnimationModule;

describe("AnimationUtils additive parity", () => {
  it("marks the immutable additive clone with THREE's additive blend mode", () => {
    const sourceValues = [1, 3];
    const source = new AnimationClip("move", 1, [
      new NumberTrack("position.x", [0, 1], sourceValues),
    ]);
    const result = makeClipAdditive(source, 0, source, 1);

    const reference = new THREEAnimationClipConstructor("move", 1, [
      new NumberKeyframeTrack("position.x", [0, 1], sourceValues),
    ]);
    const expected = THREEAnimationUtils.makeClipAdditive(
      reference,
      0,
      reference,
      1,
    );

    expect(result).not.toBe(source);
    expect(result.blendMode).toBe(AnimationBlend.Additive);
    expect(result.blendMode).toBe(expected.blendMode);
    expect(source.blendMode).toBe(AnimationBlend.Normal);
    expect(Array.from(source.tracks[0].values)).toEqual(sourceValues);
    expect(Array.from(result.tracks[0].values)).toEqual(
      Array.from(expected.tracks[0].values),
    );
  });
});

describe("AnimationUtils quaternion parity", () => {
  it("multiplies quaternion targets by the conjugate reference on the left", () => {
    const sourceValues = [0.5, 0.5, 0.5, 0.5];
    const referenceValues = [0.5, -0.5, 0.5, 0.5];
    const source = new AnimationClip("rotation", 1, [
      new QuaternionTrack("quaternion", [0], sourceValues),
    ]);
    const reference = new AnimationClip("reference", 1, [
      new QuaternionTrack("quaternion", [0], referenceValues),
    ]);

    const result = makeClipAdditive(source, 0, reference, 1);
    const values = result.tracks[0]?.values;
    if (!(values instanceof Float32Array)) {
      throw new Error("Expected numeric values.");
    }

    const threeReference = new THREEAnimationClipConstructor("reference", 1, [
      new QuaternionKeyframeTrack("quaternion", [0], referenceValues),
    ]);
    const threeTarget = new THREEAnimationClipConstructor("rotation", 1, [
      new QuaternionKeyframeTrack("quaternion", [0], sourceValues),
    ]);
    const expected = THREEAnimationUtils.makeClipAdditive(
      threeTarget,
      0,
      threeReference,
      1,
    );

    expect(Array.from(values)).toEqual(
      Array.from(expected.tracks[0]?.values ?? []),
    );
  });
});

describe("AnimationUtils subclip parity", () => {
  it("filters subclips as [startFrame, endFrame), shifts to the retained minimum, and preserves metadata", () => {
    const source = new AnimationClip("source", 4, [
      new NumberTrack("value", [0, 1, 2, 3], [0, 10, 20, 30]),
    ]);
    source.userData = { nested: { enabled: true } };
    source.blendMode = AnimationBlend.Additive;

    const result = subclip(source, "segment", 1, 3, 1);
    expect(result.name).toBe("segment");
    expect(result.duration).toBe(1);
    expect(result.blendMode).toBe(AnimationBlend.Additive);
    expect(result.userData).toEqual(source.userData);
    expect(result.userData).not.toBe(source.userData);
    expect(Array.from(result.tracks[0]?.times ?? [])).toEqual([0, 1]);
    expect(Array.from(result.tracks[0]?.values ?? [])).toEqual([10, 20]);
    expect(Array.from(source.tracks[0]?.times ?? [])).toEqual([0, 1, 2, 3]);
  });
});
