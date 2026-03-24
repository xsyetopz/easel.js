import { describe, expect, it } from "vitest";
import "../_helpers/assertions.js";
import { Box2 as TBox2, Vector2 as TVector2 } from "three";
import { Box2 } from "@/math/Box2.js";
import { Vector2 } from "@/math/Vector2.js";

describe("Box2", () => {
	it("constructor defaults to empty box", () => {
		const e = new Box2();
		expect(e.min.x).toBe(Number.POSITIVE_INFINITY);
		expect(e.max.x).toBe(Number.NEGATIVE_INFINITY);
	});

	it("set", () => {
		const e = new Box2();
		e.set(new Vector2(0, 0), new Vector2(1, 1));
		expect(e.min).toMatchVector({ x: 0, y: 0 });
		expect(e.max).toMatchVector({ x: 1, y: 1 });
	});

	it("expandByPoint", () => {
		const e = new Box2();
		e.expandByPoint(new Vector2(1, 2));
		e.expandByPoint(new Vector2(-1, 0));
		const t = new TBox2();
		t.expandByPoint(new TVector2(1, 2));
		t.expandByPoint(new TVector2(-1, 0));
		expect(e.min).toMatchVector(t.min);
		expect(e.max).toMatchVector(t.max);
	});

	it("containsPoint", () => {
		const e = new Box2(new Vector2(0, 0), new Vector2(2, 2));
		expect(e.containsPoint(new Vector2(1, 1))).toBe(true);
		expect(e.containsPoint(new Vector2(3, 1))).toBe(false);
	});

	it("getCenter (easel: getCenter method)", () => {
		const e = new Box2(new Vector2(0, 0), new Vector2(4, 4));
		const centre = e.getCenter(new Vector2());
		expect(centre).toMatchVector({ x: 2, y: 2 });
	});

	it("getSize method", () => {
		const e = new Box2(new Vector2(0, 0), new Vector2(3, 5));
		const size = e.getSize(new Vector2());
		expect(size).toMatchVector({ x: 3, y: 5 });
	});

	it("intersectsBox", () => {
		const e1 = new Box2(new Vector2(0, 0), new Vector2(2, 2));
		const e2 = new Box2(new Vector2(1, 1), new Vector2(3, 3));
		const e3 = new Box2(new Vector2(5, 5), new Vector2(6, 6));
		expect(e1.intersectsBox(e2)).toBe(true);
		expect(e1.intersectsBox(e3)).toBe(false);
	});

	it("union", () => {
		const e1 = new Box2(new Vector2(0, 0), new Vector2(1, 1));
		const e2 = new Box2(new Vector2(-1, -1), new Vector2(2, 2));
		e1.union(e2);
		const t1 = new TBox2(new TVector2(0, 0), new TVector2(1, 1));
		const t2 = new TBox2(new TVector2(-1, -1), new TVector2(2, 2));
		t1.union(t2);
		expect(e1.min).toMatchVector(t1.min);
		expect(e1.max).toMatchVector(t1.max);
	});

	it("clone", () => {
		const orig = new Box2(new Vector2(1, 2), new Vector2(3, 4));
		const c = orig.clone();
		expect(c.min).toMatchVector({ x: 1, y: 2 });
		c.expandByPoint(new Vector2(10, 10));
		expect(orig.max).toMatchVector({ x: 3, y: 4 });
	});
});
