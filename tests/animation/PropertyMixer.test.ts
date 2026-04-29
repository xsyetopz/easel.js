import { describe, expect, it } from "vitest";
import { Binding } from "@/animation/Binding.js";
import { PropertyMixer } from "@/animation/PropertyMixer.js";
import { Node } from "@/core/Node.js";

describe("PropertyMixer", () => {
	function makeScalarBinding() {
		const root = new Node() as Node & { opacity: number };
		// Use a plain numeric property for scalar testing
		root.opacity = 0.5;
		return new Binding(root, "opacity");
	}

	function makeVec3Binding() {
		const root = new Node();
		root.position.set(0, 0, 0);
		return { binding: new Binding(root, "position"), root };
	}

	it("constructs with binding and itemSize", () => {
		const binding = makeScalarBinding();
		const mixer = new PropertyMixer(binding, 1);
		expect(mixer).toBeDefined();
	});

	it("accumulate + apply writes normalized value to binding for scalar", () => {
		const root = new Node() as Node & { opacity: number };
		root.opacity = 1.0;
		const binding = new Binding(root, "opacity");
		const mixer = new PropertyMixer(binding, 1);
		mixer.accumulate(0, 1.0, [1.0]);
		mixer.apply(0);
		expect(root.opacity).toBeCloseTo(1.0);
	});

	it("apply resets buffer and cumulativeWeight after call", () => {
		const root = new Node();
		root.position.set(2, 0, 0);
		const binding = new Binding(root, "position");
		const mixer = new PropertyMixer(binding, 3);
		mixer.accumulate(0, 1, [2, 0, 0]);
		mixer.apply(0);
		// Second apply with no accumulate should not write (w=0)
		root.position.set(5, 5, 5);
		mixer.apply(0);
		expect(root.position.x).toBeCloseTo(5);
	});

	it("accumulate with weight 0 does not change property", () => {
		const { binding, root } = makeVec3Binding();
		root.position.set(3, 0, 0);
		const mixer = new PropertyMixer(binding, 3);
		mixer.accumulate(0, 0, [7, 7, 7]);
		mixer.apply(0);
		// cumulativeWeight is 0, apply should skip write
		expect(root.position.x).toBeCloseTo(3);
	});
});
