import { describe, expect, it } from "bun:test";
import {
  AnimationAction,
  LoopOnce,
  LoopRepeat,
} from "@/animation/AnimationAction.js";
import { AnimationClip } from "@/animation/AnimationClip.js";

function makeClip(duration = 1) {
  return new AnimationClip("test", duration, []);
}

describe("AnimationAction", () => {
  it("LoopOnce is 2200", () => {
    expect(LoopOnce).toBe(2200);
  });

  it("LoopRepeat is 2201", () => {
    expect(LoopRepeat).toBe(2201);
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

  it("default loop is LoopRepeat", () => {
    const action = new AnimationAction(makeClip());
    expect(action.loop).toBe(LoopRepeat);
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
    action.setLoop(LoopOnce, 1);
    expect(action.loop).toBe(LoopOnce);
    expect(action.repetitions).toBe(1);
  });
});
