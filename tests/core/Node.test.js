import { describe, expect, it } from "vitest";
import { Node } from "@/core/Node.js";

describe("Node", () => {
	it("assigns incrementing ids", () => {
		const a = new Node();
		const b = new Node();
		expect(b.id).toBe(a.id + 1);
	});

	it("has expected defaults", () => {
		const node = new Node();
		expect(node.type).toBe("Node");
		expect(node.name).toBe("");
		expect(node.parent).toBeNull();
		expect(node.children).toEqual([]);
		expect(node.visible).toBe(true);
	});

	it("add sets parent and pushes child", () => {
		const parent = new Node();
		const child = new Node();
		parent.add(child);
		expect(child.parent).toBe(parent);
		expect(parent.children).toContain(child);
	});

	it("add re-parents child from previous parent", () => {
		const p1 = new Node();
		const p2 = new Node();
		const child = new Node();
		p1.add(child);
		p2.add(child);
		expect(child.parent).toBe(p2);
		expect(p1.children).not.toContain(child);
	});

	it("remove clears parent and splices children", () => {
		const parent = new Node();
		const child = new Node();
		parent.add(child);
		parent.remove(child);
		expect(child.parent).toBeNull();
		expect(parent.children).not.toContain(child);
	});

	it("add(self) is a no-op", () => {
		const node = new Node();
		node.add(node);
		expect(node.children).toHaveLength(0);
	});

	it("traverse visits self and all descendants", () => {
		const root = new Node();
		const child = new Node();
		const grandchild = new Node();
		root.add(child);
		child.add(grandchild);
		const visited = [];
		root.traverse((n) => visited.push(n));
		expect(visited).toEqual([root, child, grandchild]);
	});

	it("traverseVisible skips invisible nodes and their subtrees", () => {
		const root = new Node();
		const child = new Node();
		const grandchild = new Node();
		root.add(child);
		child.add(grandchild);
		child.visible = false;
		const visited = [];
		root.traverseVisible((n) => visited.push(n));
		expect(visited).toEqual([root]);
	});

	it("updateMatrix composes position/rotation/scale into matrix", () => {
		const node = new Node();
		node.position.set(1, 2, 3);
		node.updateMatrix();
		const elems = node.matrix.elements;
		// Translation is in column 3 (indices 12, 13, 14 in column-major)
		expect(elems[12]).toBeCloseTo(1);
		expect(elems[13]).toBeCloseTo(2);
		expect(elems[14]).toBeCloseTo(3);
	});

	it("updateWorldMatrix without parent copies matrix to matrixWorld", () => {
		const node = new Node();
		node.position.set(5, 0, 0);
		node.updateWorldMatrix(false, false);
		expect(node.matrixWorld.elements[12]).toBeCloseTo(5);
	});

	it("updateWorldMatrix propagates parent transform to child", () => {
		const parent = new Node();
		const child = new Node();
		parent.add(child);
		parent.position.set(10, 0, 0);
		child.position.set(1, 0, 0);
		parent.updateWorldMatrix(false, true);
		expect(child.matrixWorld.elements[12]).toBeCloseTo(11);
	});

	it("clone returns new node with same position", () => {
		const node = new Node();
		node.position.set(3, 4, 5);
		node.name = "orig";
		const c = node.clone();
		expect(c).not.toBe(node);
		expect(c.name).toBe("orig");
		expect(c.position.x).toBeCloseTo(3);
	});

	it("clone with recursive=true copies children", () => {
		const node = new Node();
		const child = new Node();
		child.name = "kid";
		node.add(child);
		const c = node.clone();
		expect(c.children).toHaveLength(1);
		expect(c.children[0].name).toBe("kid");
		expect(c.children[0]).not.toBe(child);
	});

	it("lookAt rotates node to face target", () => {
		const node = new Node();
		node.lookAt(1, 0, 0);
		// quaternion should be non-identity after lookAt
		const q = node.quaternion;
		const isIdentity =
			Math.abs(q.x) < 1e-6 &&
			Math.abs(q.y) < 1e-6 &&
			Math.abs(q.z) < 1e-6 &&
			Math.abs(q.w - 1) < 1e-6;
		expect(isIdentity).toBe(false);
	});
});
