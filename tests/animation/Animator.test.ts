import { describe, expect, it } from "bun:test";
import { AnimationAction } from "@/animation/AnimationAction.js";
import { AnimationClip } from "@/animation/AnimationClip.js";
import { Animator } from "@/animation/Animator.js";
import { NumberTrack } from "@/animation/tracks/NumberTrack.js";
import { Node } from "@/core/Node.js";

describe("Animator", () => {
	function makeRoot() {
		return new Node();
	}

	function makeClip(name = "test", duration = 2) {
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

	it("update advances action time when enabled", () => {
		const root = makeRoot();
		const animator = new Animator(root);
		const clip = makeClip("anim", 2);
		const action = animator.clipAction(clip);
		action.play();
		animator.update(0.5);
		expect(action.time).toBeCloseTo(0.5);
	});

	it("stopAllAction disables all actions", () => {
		const animator = new Animator(makeRoot());
		const c1 = makeClip("a");
		const c2 = makeClip("b");
		const a1 = animator.clipAction(c1).play();
		const a2 = animator.clipAction(c2).play();
		animator.stopAllAction();
		expect(a1.enabled).toBe(false);
		expect(a2.enabled).toBe(false);
	});
});
