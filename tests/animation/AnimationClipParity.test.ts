import { describe, expect, it } from "bun:test";
import { createRequire } from "node:module";
import { NumberTrack } from "@/animation/tracks/NumberTrack.js";
import { StringTrack } from "@/animation/tracks/StringTrack.js";
import {
  AnimationBlend,
  AnimationClip,
  type AnimationClipJSON,
  animationClipFromJson,
  animationClipToJSON,
  CreateClipsFromMorphTargetSequences,
  CreateFromMorphTargetSequence,
} from "@/index.js";

type THREEAnimationClip = {
  name: string;
  duration: number;
  tracks: unknown[];
  uuid: string;
  blendMode: number;
  userData: Record<string, unknown>;
};

type THREEAnimationClipConstructor = {
  new (
    name: string,
    duration: number,
    tracks: unknown[],
    blendMode: number,
  ): THREEAnimationClip;
  toJSON(clip: THREEAnimationClip): Record<string, unknown>;
  CreateFromMorphTargetSequence(
    name: string,
    morphTargets: readonly { name: string }[],
    fps: number,
    noLoop: boolean,
  ): THREEAnimationClip;
  CreateClipsFromMorphTargetSequences(
    morphTargets: readonly { name: string }[],
    fps: number,
    noLoop: boolean,
  ): Array<{ duration: number; name: string; tracks: unknown[] }>;
};

type THREEAnimationModule = {
  AdditiveAnimationBlendMode: number;
  NormalAnimationBlendMode: number;
  AnimationClip: THREEAnimationClipConstructor;
  NumberKeyframeTrack: new (
    name: string,
    times: number[],
    values: number[],
  ) => unknown;
  StringKeyframeTrack: new (
    name: string,
    times: number[],
    values: string[],
  ) => unknown;
};

const require = createRequire(import.meta.url);
const THREE = require("three") as THREEAnimationModule;

function makeTHREEClip(): THREEAnimationClip {
  return new THREE.AnimationClip(
    "run",
    -1,
    [
      new THREE.NumberKeyframeTrack("position.x", [0, 1], [2, 3]),
      new THREE.StringKeyframeTrack("state", [0, 1], ["idle", "run"]),
    ],
    THREE.AdditiveAnimationBlendMode,
  );
}

function firstClip(clips: AnimationClip[]): AnimationClip {
  const clip = clips[0];
  if (clip === undefined)
    throw new Error("Expected a generated animation clip.");
  return clip;
}

describe("AnimationClip serialization parity", () => {
  it("serializes the THREE-compatible standalone payload without changing instance JSON", () => {
    const clip = new AnimationClip("run", -1, [
      new NumberTrack("position.x", [0, 1], [2, 3]),
      new StringTrack("state", [0, 1], ["idle", "run"]),
    ]);
    clip.blendMode = AnimationBlend.Additive;
    clip.userData = { source: "fixture", nested: { value: 7 } };

    const standalone = animationClipToJSON(clip);
    const reference = THREE.AnimationClip.toJSON(makeTHREEClip());

    expect(clip.toJSON()).toMatchObject({
      name: "run",
      duration: 1,
      blendMode: AnimationBlend.Additive,
    });
    expect(standalone).toMatchObject({
      ...reference,
      uuid: clip.uuid,
      userData: JSON.stringify(clip.userData),
    });
    expect(standalone).not.toBe(clip.toJSON());
  });
});

describe("AnimationClip metadata parity", () => {
  it("round-trips THREE-compatible uuid and userData metadata", () => {
    const source: AnimationClipJSON = {
      name: "metadata",
      duration: 1,
      tracks: [
        {
          name: "value",
          times: [0, 1],
          values: [0, 1],
          type: "number",
        },
      ],
      uuid: "00000000-0000-4000-8000-000000000001",
      blendMode: AnimationBlend.Normal,
      userData: JSON.stringify({ source: "three", nested: { enabled: true } }),
    };

    const restored = animationClipFromJson(source);

    expect(restored.uuid).toBe(source.uuid);
    expect(restored.userData).toEqual({
      source: "three",
      nested: { enabled: true },
    });
    const serialized = animationClipToJSON(restored);
    const sourceTrack = source.tracks?.[0];
    if (sourceTrack === undefined) throw new Error("Expected a source track.");
    expect(serialized).toMatchObject({
      name: source.name,
      duration: source.duration,
      uuid: source.uuid,
      blendMode: source.blendMode,
      userData: source.userData,
    });
    expect(serialized.tracks?.[0]).toMatchObject(sourceTrack);
  });
});

describe("AnimationClip morph-target parity", () => {
  it("matches THREE's sorted modulo keyframes and track names", () => {
    const sequence = [{ name: "walk1" }, { name: "walk2" }, { name: "walk3" }];
    const clip = CreateFromMorphTargetSequence("walk", sequence, 6, false);
    const reference = THREE.AnimationClip.CreateFromMorphTargetSequence(
      "walk",
      sequence,
      6,
      false,
    );

    expect(clip.duration).toBeCloseTo(reference.duration);
    expect(clip.tracks.map((track) => track.name)).toEqual(
      reference.tracks.map((track) => (track as { name: string }).name),
    );
    expect(Array.from(clip.tracks[0].times)).toEqual(
      Array.from((reference.tracks[0] as { times: Float32Array }).times),
    );
    expect(Array.from(clip.tracks[0].values)).toEqual(
      Array.from((reference.tracks[0] as { values: Float32Array }).values),
    );
  });

  it("matches noLoop keyframe omission and grouped numeric suffix filtering", () => {
    const mixedTargets = [
      { name: "walk1" },
      { name: "walk2" },
      { name: "unmatched" },
    ];
    const clip = firstClip(
      CreateClipsFromMorphTargetSequences(mixedTargets, 6, true),
    );
    const reference = THREE.AnimationClip.CreateClipsFromMorphTargetSequences(
      mixedTargets,
      6,
      true,
    )[0];

    expect(reference).toBeDefined();
    expect(clip.name).toBe(reference?.name);
    expect(clip.duration).toBeCloseTo(reference?.duration ?? -1);
    expect(clip.tracks).toHaveLength(reference?.tracks.length ?? -1);
    expect(
      CreateClipsFromMorphTargetSequences([{ name: "unmatched" }], 6, false),
    ).toHaveLength(0);
  });
});

describe("AnimationClip validation and clone parity", () => {
  it("deep-copies userData when cloning", () => {
    const clip = new AnimationClip("metadata", 1, [
      new NumberTrack("value", [0, 1], [0, 1]),
    ]);
    clip.userData = { nested: { enabled: true } };

    const clone = clip.clone();
    (clone.userData["nested"] as { enabled: boolean }).enabled = false;

    expect(clip.userData).toEqual({ nested: { enabled: true } });
  });

  it("delegates clip validation to each track", () => {
    const track = new NumberTrack("value", [0, 1], [0, 1]);
    const clip = new AnimationClip("validation", 1, [track]);
    track.times[1] = track.times[0];

    expect(clip.validate()).toBe(false);
  });
});
