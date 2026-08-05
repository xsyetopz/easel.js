import { describe, expect, it } from "bun:test";
import { AnimationAction, Loop } from "@/animation/AnimationAction.js";
import { AnimationClip } from "@/animation/AnimationClip.js";

function makeClip(duration = 1): AnimationClip {
  return new AnimationClip("test", duration, []);
}

describe("AnimationAction", () => {
  it("Loop.Once is 2200", () => {
    expect(Loop.Once).toBe(2200);
  });

  it("Loop.Repeat is 2201", () => {
    expect(Loop.Repeat).toBe(2201);
  });

  it("stores clip reference", () => {
    const clip = makeClip();
    const action = new AnimationAction(clip);
    expect(action.clip).toBe(clip);
  });

  it("defaults: enabled=true, weight=1, timeScale=1, time=0", () => {
    const action = new AnimationAction(makeClip());
    expect(action.enabled).toBe(true);
    expect(action.weight).toBe(1);
    expect(action.timeScale).toBe(1);
    expect(action.time).toBe(0);
  });

  it("default loop is Loop.Repeat", () => {
    const action = new AnimationAction(makeClip());
    expect(action.loop).toBe(Loop.Repeat);
  });

  it("play() sets enabled=true and returns this", () => {
    const action = new AnimationAction(makeClip());
    action.enabled = false;
    const ret = action.play();
    expect(action.enabled).toBe(true);
    expect(ret).toBe(action);
  });

  it("stop() sets enabled=false, resets time, returns this", () => {
    const action = new AnimationAction(makeClip());
    action.time = 0.5;
    const ret = action.stop();
    expect(action.enabled).toBe(false);
    expect(action.time).toBe(0);
    expect(ret).toBe(action);
  });

  it("reset() resets time to 0, re-enables, returns this", () => {
    const action = new AnimationAction(makeClip());
    action.time = 0.9;
    action.enabled = false;
    const ret = action.reset();
    expect(action.time).toBe(0);
    expect(action.enabled).toBe(true);
    expect(ret).toBe(action);
  });

  it("setLoop updates loop mode and repetitions", () => {
    const action = new AnimationAction(makeClip());
    action.setLoop(Loop.Once, 1);
    expect(action.loop).toBe(Loop.Once);
    expect(action.repetitions).toBe(1);
  });

  it("exposes effective state through accessors", () => {
    const action = new AnimationAction(makeClip());
    action.weight = 0.25;
    expect(action.effectiveWeight).toBe(0.25);
    action.enabled = false;
    expect(action.effectiveWeight).toBe(0);
    action.timeScale = 2;
    expect(action.duration).toBe(0.5);
    action.paused = true;
    expect(action.effectiveTimeScale).toBe(0);
  });

  it("starts only when an explicit animator timeline reaches its schedule", () => {
    const action = new AnimationAction(makeClip(2)).schedule(1);
    action.advance(0.5, 0.5);
    expect(action.time).toBe(0);
    expect(action.scheduled).toBe(true);
    action.advance(0.75, 1.25);
    expect(action.time).toBe(0.25);
    expect(action.scheduled).toBe(false);
  });

  it("supports cancellable fades and warps without mixer-owned caches", () => {
    const action = new AnimationAction(makeClip()).fadeIn(1);
    action.advance(0.5);
    expect(action.weight).toBeCloseTo(0.5);
    action.cancelFade().warp(1, 2, 1);
    action.advance(0.5);
    expect(action.timeScale).toBeCloseTo(1.5);
    action.cancelWarp().advance(0.5);
    expect(action.timeScale).toBeCloseTo(1.5);
  });

  it("provides explicit duration, synchronization, and halt helpers", () => {
    const source = new AnimationAction(makeClip(2));
    source.time = 0.75;
    source.timeScale = 0.5;
    const target = new AnimationAction(makeClip(2)).syncWith(source);
    expect(target.time).toBe(0.75);
    expect(target.timeScale).toBe(0.5);
    target.duration = 1;
    expect(target.timeScale).toBe(2);
    target.halt(1).advance(1);
    expect(target.paused).toBe(true);
    expect(target.timeScale).toBe(0);
  });

  it("rejects invalid transition and loop configuration", () => {
    const action = new AnimationAction(makeClip());
    expect(() => action.fadeIn(0)).toThrow(RangeError);
    expect(() => action.warp(1, Number.NaN, 1)).toThrow(RangeError);
    expect(() => action.setLoop(Loop.Repeat, -1)).toThrow(RangeError);
  });
});
