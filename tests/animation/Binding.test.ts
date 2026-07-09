import { describe, expect, it } from "bun:test";
import { Binding } from "@/animation/Binding.js";
import { Node } from "@/core/Node.js";

describe("Binding", () => {
	it("stores root and path", () => {
		const root = new Node();
		const b = new Binding(root, "position.x");
		expect(b.root).toBe(root);
		expect(b.path).toBe("position.x");
	});

	it("resolveNode returns root when no nodeName in path", () => {
		const root = new Node();
		const b = new Binding(root, "position.x");
		expect(b.resolveNode()).toBe(root);
	});

	it("resolveNode finds named child", () => {
		const root = new Node();
		const child = new Node();
		child.name = "hip";
		root.add(child);
		const b = new Binding(root, "hip.position");
		expect(b.resolveNode()).toBe(child);
	});

	it("resolveNode returns undefined for unknown name", () => {
		const root = new Node();
		const b = new Binding(root, "unknown.position");
		expect(b.resolveNode()).toBeUndefined();
	});

	it("getValue reads Vector3 position into array", () => {
		const root = new Node();
		root.position.set(1, 2, 3);
		const b = new Binding(root, "position");
		const arr = new Array(3);
		b.getValue(arr, 0);
		expect(arr[0]).toBeCloseTo(1);
		expect(arr[1]).toBeCloseTo(2);
		expect(arr[2]).toBeCloseTo(3);
	});

	it("setValue writes Vector3 component via indexed path", () => {
		const root = new Node();
		const b = new Binding(root, "position.y");
		b.setValue([42], 0);
		expect(root.position.y).toBeCloseTo(42);
	});

	it("getValue reads scalar property into array", () => {
		const root = new Node();
		root.scale.set(2, 2, 2);
		const b = new Binding(root, "scale.x");
		const arr = [0];
		b.getValue(arr, 0);
		expect(arr[0]).toBeCloseTo(2);
	});

	it("setValue writes scalar into property index", () => {
		const root = new Node();
		const b = new Binding(root, "scale.x");
		b.setValue([5], 0);
		expect(root.scale.x).toBeCloseTo(5);
	});
});
