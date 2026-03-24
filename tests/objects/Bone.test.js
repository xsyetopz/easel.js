import { describe, expect, it } from "vitest";
import { Node } from "@/core/Node.js";
import { Bone } from "@/objects/Bone.ts";

describe("Bone", () => {
	it("has type='Bone'", () => {
		expect(new Bone().type).toBe("Bone");
	});

	it("inherits from Node", () => {
		expect(new Bone()).toBeInstanceOf(Node);
	});

	it("clone returns a Bone", () => {
		const bone = new Bone();
		bone.name = "hip";
		const c = bone.clone();
		expect(c).toBeInstanceOf(Bone);
		expect(c.name).toBe("hip");
		expect(c).not.toBe(bone);
	});

	it("starts with no children", () => {
		expect(new Bone().children).toHaveLength(0);
	});
});
