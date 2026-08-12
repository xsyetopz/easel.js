import { describe, expect, it } from "bun:test";
import { Object3D } from "three";
import { AnimationClip } from "@/animation/AnimationClip.js";
import { Animator } from "@/animation/Animator.js";
import { Loop } from "@/animation/AnimationAction.js";
import { NumberTrack } from "@/animation/tracks/NumberTrack.js";
import { Node } from "@/core/Node.js";

type ThreeAnimationModule = {
  AnimationClip: new (
    name: string,
    duration: number,
    tracks: object[],
  ) => object;
  AnimationMixer: new (
    root: Object3D,
  ) => {
    time: number;
    clipAction(clip: object): { play(): void };
    update(deltaTime: number): unknown;
    setTime(time: number): unknown;
  };
  NumberKeyframeTrack: new (
    name: string,
    times: number[],
    values: number[],
  ) => object;
};

describe("Animator THREE.js parity", () => {
  it("setTime resets and evaluates active actions like THREE.AnimationMixer", async () => {
    const three = (await import("three")) as unknown as ThreeAnimationModule;
    const root = new Node();
    const animator = new Animator(root);
    const clip = new AnimationClip("set-time", 2, [
      new NumberTrack("position.x", [0, 2], [0, 10]),
    ]);
    animator.clipAction(clip).play();
    animator.update(0.5);

    const threeRoot = new Object3D();
    const threeClip = new three.AnimationClip("set-time", 2, [
      new three.NumberKeyframeTrack(".position[x]", [0, 2], [0, 10]),
    ]);
    const threeMixer = new three.AnimationMixer(threeRoot);
    threeMixer.clipAction(threeClip).play();
    threeMixer.update(0.5);

    expect(animator.setTime(1)).toBe(animator);
    expect(threeMixer.setTime(1)).toBe(threeMixer);

    expect(animator.time).toBe(threeMixer.time);
    expect(root.position.x).toBeCloseTo(threeRoot.position.x);

    const stateAction = animator.existingAction(clip);
    if (stateAction === undefined) throw new Error("Expected cached action.");
    stateAction.loop = Loop.Once;
    stateAction.paused = true;
    stateAction.fadeIn(1);
    expect(animator.setTime(0.25)).toBe(animator);
    expect(stateAction.loop).toBe(Loop.Once);
    expect(stateAction.paused).toBe(true);
  });

  it("snapshots clip tracks when creating an action", () => {
    const root = new Node();
    const animator = new Animator(root);
    const first = new NumberTrack("position.x", [0, 1], [0, 10]);
    const clip = new AnimationClip("snapshot", 1, [first]);
    const action = animator.clipAction(clip);
    clip.tracks[0] = new NumberTrack("position.y", [0, 1], [0, 10]);

    action.play();
    animator.update(0.5);

    expect(root.position.x).toBeCloseTo(5);
    expect(root.position.y).toBe(0);
  });
});
