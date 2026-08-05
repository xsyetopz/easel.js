import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { AnimationAction, Loop } from "@/animation/AnimationAction.js";
import { AnimationClip } from "@/animation/AnimationClip.js";
import { Animator } from "@/animation/Animator.js";
import { NumberTrack } from "@/animation/tracks/NumberTrack.js";
import { Node } from "@/core/Node.js";

describe("Animator", () => {
  function makeRoot(): Node {
    return new Node();
  }

  function makeClip(name = "test", duration = 2): AnimationClip {
    const track = new NumberTrack("position.x", [0, duration], [0, 10]);
    return new AnimationClip(name, duration, [track]);
  }

  it("constructs with root node", () => {
    const root = makeRoot();
    const animator = new Animator(root);
    expect(animator.root).toBe(root);
  });

  it("initial time is 0", () => {
    expect(new Animator(makeRoot()).time).toBe(0);
  });

  it("clipAction creates an AnimationAction", () => {
    const animator = new Animator(makeRoot());
    const clip = makeClip();
    const action = animator.clipAction(clip);
    expect(action).toBeInstanceOf(AnimationAction);
    expect(action.clip).toBe(clip);
  });

  it("clipAction returns cached action on second call", () => {
    const animator = new Animator(makeRoot());
    const clip = makeClip();
    const a1 = animator.clipAction(clip);
    const a2 = animator.clipAction(clip);
    expect(a1).toBe(a2);
  });

  it("existingAction returns undefined before clipAction", () => {
    const animator = new Animator(makeRoot());
    const clip = makeClip();
    expect(animator.existingAction(clip)).toBeUndefined();
  });

  it("existingAction returns cached action after clipAction", () => {
    const animator = new Animator(makeRoot());
    const clip = makeClip();
    const action = animator.clipAction(clip);
    expect(animator.existingAction(clip)).toBe(action);
  });

  it("update(delta) advances animator time", () => {
    const animator = new Animator(makeRoot());
    animator.update(0.5);
    expect(animator.time).toBeCloseTo(0.5);
    animator.update(0.25);
    expect(animator.time).toBeCloseTo(0.75);
  });

  it("scales global time explicitly and supports pausing", () => {
    const animator = new Animator(makeRoot());
    animator.timeScale = 2;
    expect(animator.update(0.25)).toBe(animator);
    expect(animator.time).toBe(0.5);
    animator.timeScale = 0;
    animator.update(1);
    expect(animator.time).toBe(0.5);
  });

  it("rejects invalid global timing inputs", () => {
    const animator = new Animator(makeRoot());
    expect(() => {
      animator.timeScale = -1;
    }).toThrow(RangeError);
    expect(() => animator.update(Number.NaN)).toThrow(RangeError);
    expect(() => animator.seek(-1)).toThrow(RangeError);
  });

  it("seeks from zero with the locked THREE.js positive-time semantics", () => {
    const root = makeRoot();
    const animator = new Animator(root);
    const clip = makeClip("seek", 2);
    animator.clipAction(clip).play();
    animator.timeScale = 0.5;

    const THREERoot = new THREE.Object3D();
    const {
      AnimationClip: THREEAnimationClip,
      AnimationMixer,
      NumberKeyframeTrack,
    } = THREE as unknown as {
      AnimationClip: new (
        name: string,
        duration: number,
        tracks: object[],
      ) => object;
      AnimationMixer: new (
        root: THREE.Object3D,
      ) => {
        time: number;
        timeScale: number;
        clipAction(clip: object): { play(): void };
        setTime(time: number): void;
      };
      NumberKeyframeTrack: new (
        name: string,
        times: number[],
        values: number[],
      ) => object;
    };
    const THREEClip = new THREEAnimationClip("seek", 2, [
      new NumberKeyframeTrack(".position[x]", [0, 2], [0, 10]),
    ]);
    const THREEMixer = new AnimationMixer(THREERoot);
    THREEMixer.clipAction(THREEClip).play();
    THREEMixer.timeScale = 0.5;

    expect(animator.seek(1)).toBe(animator);
    THREEMixer.setTime(1);

    expect(animator.time).toBe(THREEMixer.time);
    expect(root.position.x).toBeCloseTo(THREERoot.position.x);
  });

  it("update advances action time when enabled", () => {
    const root = makeRoot();
    const animator = new Animator(root);
    const clip = makeClip("anim", 2);
    const action = animator.clipAction(clip);
    action.play();
    animator.update(0.5);
    expect(action.time).toBeCloseTo(0.5);
  });

  it("stopAll disables all actions", () => {
    const animator = new Animator(makeRoot());
    const c1 = makeClip("a");
    const c2 = makeClip("b");
    const a1 = animator.clipAction(c1).play();
    const a2 = animator.clipAction(c2).play();
    expect(animator.stopAll()).toBe(animator);
    expect(a1.enabled).toBe(false);
    expect(a2.enabled).toBe(false);
  });

  it("removes naturally finished actions from active playback", () => {
    const animator = new Animator(makeRoot());
    const action = animator.clipAction(makeClip("once", 1));
    action.setLoop(Loop.Once, 0).play();

    animator.update(1);

    expect(action.enabled).toBe(false);
    expect(action.active).toBe(false);
  });

  it("shares mixers across actions for weighted blending", () => {
    const root = makeRoot();
    const first = new AnimationClip("first", 1, [
      new NumberTrack("position.x", [0, 1], [0, 10]),
    ]);
    const second = new AnimationClip("second", 1, [
      new NumberTrack("position.x", [0, 1], [10, 20]),
    ]);
    const animator = new Animator(root);
    const firstAction = animator.clipAction(first).play();
    const secondAction = animator.clipAction(second).play();
    firstAction.weight = 0.5;
    secondAction.weight = 0.5;

    animator.update(0.5);
    expect(root.position.x).toBeCloseTo(10);

    secondAction.stop();
    animator.update(0.1);
    expect(root.position.x).toBeCloseTo(3);

    firstAction.stop();
    animator.update(0.1);
    expect(root.position.x).toBeCloseTo(0);
  });
});
