import { describe, expect, it } from "vitest";
import { Node } from "@/core/Node.js";
import { Group } from "@/objects/Group.ts";

describe("Group", () => {
	it("has type='Group'", () => {
		expect(new Group().type).toBe("Group");
	});

	it("inherits from Node", () => {
		expect(new Group()).toBeInstanceOf(Node);
	});

	it("can add children", () => {
		const group = new Group();
		const child = new Node();
		group.add(child);
		expect(group.children).toContain(child);
		expect(child.parent).toBe(group);
	});

	it("starts with no children", () => {
		expect(new Group().children).toHaveLength(0);
	});
});
