import { describe, expect, it } from "bun:test";
import { AnimationClip } from "@/animation/AnimationClip.js";
import { AnimationGroup } from "@/animation/AnimationGroup.js";
import { Animator } from "@/animation/Animator.js";
import { NumberTrack } from "@/animation/tracks/NumberTrack.js";

const clip = new AnimationClip("shared", 1, [
  new NumberTrack("value", [0, 1], [0, 10]),
]);

describe("AnimationGroup", () => {
  it("uses Set-style explicit membership", () => {
    const first = { value: 0 };
    const second = { value: 0 };
    const group = new AnimationGroup(first, first);

    expect(group.size).toBe(1);
    expect(group.has(first)).toBe(true);
    expect(group.add(second)).toBe(group);
    expect(group.roots).toEqual([first, second]);
    expect(group.delete(first)).toBe(true);
    expect(group.delete(first)).toBe(false);
    group.clear();
    expect(group.size).toBe(0);
  });

  it("applies one animation state to every prepared root", () => {
    const first = { value: 0 };
    const second = { value: 0 };
    const animator = new Animator(new AnimationGroup(first, second));
    animator.clipAction(clip).play();

    animator.update(0.5);

    expect(first.value).toBe(5);
    expect(second.value).toBe(5);
  });

  it("requires an explicit binding rebuild after membership changes", () => {
    const first = { value: 0 };
    const second = { value: 0 };
    const group = new AnimationGroup(first);
    const animator = new Animator(group);
    animator.clipAction(clip).play();

    group.add(second);
    animator.update(0.5);
    expect(first.value).toBe(5);
    expect(second.value).toBe(0);

    animator.rebuildBindings();
    animator.update(0.25);
    expect(first.value).toBe(7.5);
    expect(second.value).toBe(7.5);
  });
});
