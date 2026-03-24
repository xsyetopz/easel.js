import { describe, expect, it } from "vitest";
import "../_helpers/assertions.js";
import { Vector4 } from "@/math/Vector4.js";

describe("Vector4", () => {
	it("constructor defaults", () => {
		const e = new Vector4();
		// easel default w=1, three default w=1
		expect(e.x).toBe(0);
		expect(e.y).toBe(0);
		expect(e.z).toBe(0);
		expect(e.w).toBe(1);
	});

	it("constructor with args", () => {
		const e = new Vector4(1, 2, 3, 4);
		expect(e.x).toBe(1);
		expect(e.y).toBe(2);
		expect(e.z).toBe(3);
		expect(e.w).toBe(4);
	});

	it("set", () => {
		const e = new Vector4().set(1, 2, 3, 4);
		expect(e).toMatchVector({ x: 1, y: 2, z: 3, w: 4 });
	});

	it("add - manual check", () => {
		const e = new Vector4(1, 2, 3, 4);
		e.x += 1;
		e.y += 1;
		e.z += 1;
		e.w += 1;
		expect(e).toMatchVector({ x: 2, y: 3, z: 4, w: 5 });
	});

	it("mulScalar via divScalar inverse", () => {
		const e = new Vector4(2, 4, 6, 8).divScalar(2);
		expect(e).toMatchVector({ x: 1, y: 2, z: 3, w: 4 });
	});

	it("length", () => {
		const e = new Vector4(1, 0, 0, 0);
		expect(e.length).toBeCloseTo(1);
	});

	it("lengthSq is getter", () => {
		const e = new Vector4(2, 2, 2, 2);
		expect(e.lengthSq).toBeCloseTo(16);
	});

	it("normalize", () => {
		const e = new Vector4(2, 0, 0, 0).normalize();
		expect(e.length).toBeCloseTo(1);
	});

	it("clone", () => {
		const orig = new Vector4(1, 2, 3, 4);
		const c = orig.clone();
		expect(c).toMatchVector({ x: 1, y: 2, z: 3, w: 4 });
		c.set(9, 9, 9, 9);
		expect(orig.x).toBe(1);
	});

	it("equals - not a method on Vector4, use manual compare", () => {
		const a = new Vector4(1, 2, 3, 4);
		const b = new Vector4(1, 2, 3, 4);
		expect(a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w).toBe(true);
	});
});
