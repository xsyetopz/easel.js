import { describe, expect, it } from "vitest";
import { Node } from "@/core/Node.js";
import { Scene } from "@/core/Scene.js";

describe("Scene", () => {
	it("has type='Scene'", () => {
		const scene = new Scene();
		expect(scene.type).toBe("Scene");
	});

	it("fog defaults to undefined", () => {
		const scene = new Scene();
		expect(scene.fog).toBeundefined();
	});

	it("fog can be assigned", () => {
		const scene = new Scene();
		const fog = { type: "Fog", color: undefined, near: 1, far: 100 };
		scene.fog = fog;
		expect(scene.fog).toBe(fog);
	});

	it("inherits from Node", () => {
		const scene = new Scene();
		expect(scene).toBeInstanceOf(Node);
	});

	it("can add children", () => {
		const scene = new Scene();
		const child = new Node();
		scene.add(child);
		expect(scene.children).toContain(child);
	});

	it("clone returns a Scene", () => {
		const scene = new Scene();
		const c = scene.clone();
		expect(c).toBeInstanceOf(Scene);
		expect(c.type).toBe("Scene");
	});
});
