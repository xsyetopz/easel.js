import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.js";
import { Vector2 as TVector2 } from "three";
import { Vector2 } from "@/math/Vector2.js";

describe("Vector2", () => {
	it("constructor defaults", () => {
		const e = new Vector2();
		const t = new TVector2();
		expect(e.x).toBe(t.x);
		expect(e.y).toBe(t.y);
	});

	it("constructor with args", () => {
		const e = new Vector2(3, 4);
		expect(e.x).toBe(3);
		expect(e.y).toBe(4);
	});

	it("set", () => {
		const e = new Vector2().set(1, 2);
		const t = new TVector2().set(1, 2);
		expect(e).toMatchVector(t);
	});

	it("add", () => {
		const e = new Vector2(1, 2).add(new Vector2(3, 4));
		const t = new TVector2(1, 2).add(new TVector2(3, 4));
		expect(e).toMatchVector(t);
	});

	it("sub", () => {
		const e = new Vector2(5, 7).sub(new Vector2(2, 3));
		const t = new TVector2(5, 7).sub(new TVector2(2, 3));
		expect(e).toMatchVector(t);
	});

	it("mulScalar", () => {
		const e = new Vector2(2, 3).mulScalar(4);
		const t = new TVector2(2, 3).multiplyScalar(4);
		expect(e).toMatchVector(t);
	});

	it("clone", () => {
		const orig = new Vector2(1, 2);
		const c = orig.clone();
		expect(c).toMatchVector({ x: 1, y: 2 });
		c.set(9, 9);
		expect(orig.x).toBe(1);
	});

	it("equals", () => {
		expect(new Vector2(1, 2).equals(new Vector2(1, 2))).toBe(true);
		expect(new Vector2(1, 2).equals(new Vector2(1, 3))).toBe(false);
	});

	it("zero vector mulScalar", () => {
		const e = new Vector2(0, 0).mulScalar(99);
		expect(e).toMatchVector({ x: 0, y: 0 });
	});
});
