import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { AnimationClip } from "@/animation/AnimationClip.js";
import {
  convertArray,
  flattenJSON,
  getKeyframeOrder,
  isTypedArray,
  makeClipAdditive,
  sortedArray,
  subclip,
} from "@/animation/AnimationUtils.js";
import {
  Interpolation,
  InterpolationEnding,
  Track,
} from "@/animation/Track.js";
import { NumberTrack } from "@/animation/tracks/NumberTrack.js";
import { QuaternionTrack } from "@/animation/tracks/QuaternionTrack.js";

const {
  AnimationClip: THREEAnimationClip,
  AnimationUtils: THREEAnimationUtils,
  QuaternionKeyframeTrack,
} = THREE as unknown as {
  AnimationClip: new (
    name: string,
    duration: number,
    tracks: Array<{ values: Float32Array }>,
  ) => { tracks: Array<{ values: Float32Array }> };
  AnimationUtils: {
    makeClipAdditive(
      clip: { tracks: Array<{ values: Float32Array }> },
      referenceFrame: number,
      referenceClip: { tracks: Array<{ values: Float32Array }> },
      fps: number,
    ): unknown;
  };
  QuaternionKeyframeTrack: new (
    name: string,
    times: number[],
    values: number[],
  ) => { values: Float32Array };
};

describe("AnimationUtils", () => {
  it("preserves explicit interpolation settings when creating a subclip", () => {
    const track = new NumberTrack("value", [0, 1, 2], [0, 1, 0], {
      interpolation: Interpolation.Smooth,
      endingStart: InterpolationEnding.ZeroSlope,
      endingEnd: InterpolationEnding.WrapAround,
    });
    const result = subclip(
      new AnimationClip("source", 2, [track]),
      "result",
      0,
      2,
      1,
    );
    const resultTrack = result.tracks[0];
    expect(resultTrack).toBeInstanceOf(Track);
    const numericTrack = resultTrack as Track;

    expect(numericTrack.interpolation).toBe(Interpolation.Smooth);
    expect(numericTrack.endingStart).toBe(InterpolationEnding.ZeroSlope);
    expect(numericTrack.endingEnd).toBe(InterpolationEnding.WrapAround);
  });

  it("slices explicit Bezier tangents together with their keyframes", () => {
    const track = new NumberTrack("value", [0, 1, 2], [0, 1, 0], {
      interpolation: Interpolation.Bezier,
      inTangents: [0, 0, 0.75, 0.75, 1.75, 0.25],
      outTangents: [0.25, 0.25, 1.25, 0.75, 2, 0],
    });
    const result = subclip(
      new AnimationClip("source", 2, [track]),
      "result",
      1,
      2,
      1,
    );
    const resultTrack = result.tracks[0];
    expect(resultTrack).toBeInstanceOf(Track);
    const numericTrack = resultTrack as Track;

    expect(numericTrack.interpolation).toBe(Interpolation.Bezier);
    expect(Array.from(numericTrack.inTangents ?? [])).toEqual([
      -0.25, 0.75, 0.75, 0.25,
    ]);
    expect(Array.from(numericTrack.outTangents ?? [])).toEqual([
      0.25, 0.75, 1, 0,
    ]);
  });

  it("provides validated ordering and independent array conversion utilities", () => {
    const source = new Float32Array([3, 1, 2]);
    const converted = convertArray(source, Float64Array);
    expect(converted).toBeInstanceOf(Float64Array);
    expect(Array.from(converted)).toEqual([3, 1, 2]);
    expect(convertArray(source, Array)).toEqual([3, 1, 2]);
    expect(isTypedArray(source)).toBe(true);
    expect(isTypedArray(new DataView(new ArrayBuffer(4)))).toBe(false);
    const order = getKeyframeOrder([2, 0, 1]);
    expect(order).toEqual([1, 2, 0]);
    expect(Array.from(sortedArray(source, 1, order))).toEqual([1, 2, 3]);
    expect(() => sortedArray(source, 2, order)).toThrow(
      "order length * stride",
    );
  });

  it("flattens explicit scalar and array keyframe properties", () => {
    const times: number[] = [];
    const values: Array<number | boolean | string> = [];
    flattenJSON(
      [{ time: 0, value: [1, 2] }, { time: 1 }, { time: 2, value: [3, 4] }],
      times,
      values,
      "value",
    );
    expect(times).toEqual([0, 2]);
    expect(values).toEqual([1, 2, 3, 4]);
  });

  it("creates an immutable quaternion-correct additive clip matching THREE.js", () => {
    const times = [0, 1];
    const values = [0, 0, 0, 1, 0, Math.SQRT1_2, 0, Math.SQRT1_2];
    const source = new AnimationClip("turn", 1, [
      new QuaternionTrack("quaternion", times, values),
    ]);
    const result = makeClipAdditive(source, 1, source, 2);
    const reference = new THREEAnimationClip("turn", 1, [
      new QuaternionKeyframeTrack("quaternion", times, values),
    ]);
    THREEAnimationUtils.makeClipAdditive(reference, 1, reference, 2);

    expect(result).not.toBe(source);
    expect(Array.from(source.tracks[0].values)).toEqual(
      Array.from(new Float32Array(values)),
    );
    const actual = Array.from(result.tracks[0].values) as number[];
    const expected = Array.from(reference.tracks[0].values) as number[];
    for (let index = 0; index < actual.length; index++) {
      expect(actual[index]).toBeCloseTo(expected[index], 6);
    }
  });

  it("rejects invalid frame rates instead of silently replacing them", () => {
    const clip = new AnimationClip("clip", 1, []);
    expect(() => subclip(clip, "part", 0, 1, 0)).toThrow("greater than zero");
    expect(() => makeClipAdditive(clip, 0, clip, 0)).toThrow(
      "greater than zero",
    );
  });
});
