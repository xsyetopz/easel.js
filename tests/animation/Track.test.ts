import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import {
  Interpolation,
  InterpolationEnding,
  Track,
} from "@/animation/Track.js";

interface ReferenceInterpolant {
  settings: { endingStart: number; endingEnd: number } | null;
  evaluate(time: number): Float32Array;
}

interface ReferenceBezierInterpolant extends ReferenceInterpolant {
  inTangents: Float32Array;
  outTangents: Float32Array;
}

const {
  BezierInterpolant: THREEBezierInterpolant,
  CubicInterpolant: THREECubicInterpolant,
  ZeroSlopeEnding: THREEZeroSlopeEnding,
} = THREE as unknown as {
  BezierInterpolant: new (
    times: Float32Array,
    values: Float32Array,
    itemSize: number,
  ) => ReferenceBezierInterpolant;
  CubicInterpolant: new (
    times: Float32Array,
    values: Float32Array,
    itemSize: number,
  ) => ReferenceInterpolant;
  ZeroSlopeEnding: number;
};

describe("Track", () => {
  it("stores name, times, values, itemSize", () => {
    const t = new Track("position.x", [0, 1], [0, 10], { itemSize: 1 });
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

  it("owns independent typed-array storage", () => {
    const times = new Float32Array([0, 1]);
    const values = new Float32Array([5, 10]);
    const track = new Track("x", times, values);
    times[0] = 9;
    values[0] = 9;
    expect(Array.from(track.times)).toEqual([0, 1]);
    expect(Array.from(track.values)).toEqual([5, 10]);
  });

  it("returns independent shifted, scaled, trimmed, and optimized tracks", () => {
    const track = new Track("x", [0, 1, 2, 3], [0, 1, 1, 2]);
    expect(Array.from(track.shift(2).times)).toEqual([2, 3, 4, 5]);
    expect(Array.from(track.scale(2).times)).toEqual([0, 2, 4, 6]);
    expect(Array.from(track.trim(1, 2).times)).toEqual([1, 2]);
    expect(Array.from(track.optimize().times)).toEqual([0, 1, 2, 3]);
    expect(Array.from(track.times)).toEqual([0, 1, 2, 3]);
    expect(track.clone()).not.toBe(track);
    expect(track.validate()).toBe(true);
  });

  it("transforms Bezier tangent times with track times", () => {
    const track = new Track("x", [0, 1], [0, 1], {
      interpolation: Interpolation.Bezier,
      inTangents: [0, 0, 0.75, 0.75],
      outTangents: [0.25, 0.25, 1, 1],
    });
    expect(Array.from(track.shift(2).inTangents ?? [])).toEqual([
      2, 0, 2.75, 0.75,
    ]);
    expect(Array.from(track.scale(2).outTangents ?? [])).toEqual([
      0.5, 0.25, 2, 1,
    ]);
  });

  it("rejects transforms that would invalidate keyframe ordering", () => {
    const track = new Track("x", [0, 1], [0, 1]);
    expect(() => track.shift(Number.NaN)).toThrow("finite");
    expect(() => track.scale(0)).toThrow("greater than zero");
    expect(() => track.trim(2, 1)).toThrow("startTime <= endTime");
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
    const t = new Track("pos", [0, 1], [0, 0, 0, 1, 2, 3], {
      itemSize: 3,
    });
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

  it("supports explicit discrete interpolation", () => {
    const track = new Track("x", [0, 1, 2], [2, 4, 8], {
      interpolation: Interpolation.Discrete,
    });
    expect(track.getValueAtTime(1.75)).toEqual([4]);
  });

  it("matches THREE.js smooth interpolation with explicit endpoint behavior", () => {
    const times = new Float32Array([0, 1, 2, 3]);
    const values = new Float32Array([0, 2, -1, 4]);
    const track = new Track("x", times, values, {
      interpolation: Interpolation.Smooth,
      endingStart: InterpolationEnding.ZeroSlope,
      endingEnd: InterpolationEnding.ZeroSlope,
    });
    const reference = new THREECubicInterpolant(times, values, 1);
    reference.settings = {
      endingStart: THREEZeroSlopeEnding,
      endingEnd: THREEZeroSlopeEnding,
    };
    for (const time of [0.25, 0.75, 1.25, 2.5]) {
      expect(track.getValueAtTime(time)[0]).toBeCloseTo(
        reference.evaluate(time)[0],
        6,
      );
    }
  });

  it("matches THREE.js Bezier interpolation when tangents are explicit", () => {
    const times = new Float32Array([0, 1, 2]);
    const values = new Float32Array([0, 2, 1]);
    const inTangents = new Float32Array([0, 0, 0.75, 1.5, 1.75, 1.25]);
    const outTangents = new Float32Array([0.25, 0.5, 1.25, 2.5, 2, 1]);
    const track = new Track("x", times, values, {
      interpolation: Interpolation.Bezier,
      inTangents,
      outTangents,
    });
    const reference = new THREEBezierInterpolant(times, values, 1);
    reference.inTangents = inTangents;
    reference.outTangents = outTangents;
    for (const time of [0.25, 0.5, 1.25, 1.75]) {
      expect(track.getValueAtTime(time)[0]).toBeCloseTo(
        reference.evaluate(time)[0],
        6,
      );
    }
  });

  it("rejects malformed keyframe and Bezier data", () => {
    expect(() => new Track("x", [0, 1], [0])).toThrow("values length");
    expect(
      () =>
        new Track("x", [0, 1], [0, 1], {
          interpolation: Interpolation.Bezier,
        }),
    ).toThrow("requires inTangents and outTangents");
  });
});
