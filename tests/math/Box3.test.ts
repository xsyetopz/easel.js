import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.js";
import { Box3 as TBox3, Vector3 as TVector3 } from "three";
import { Box3 } from "@/math/Box3.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Box3", () => {
	it("constructor defaults to empty box", () => {
		const e = new Box3();
		expect(e.min.x).toBe(Number.POSITIVE_INFINITY);
		expect(e.max.x).toBe(Number.NEGATIVE_INFINITY);
	});

	it("set via constructor", () => {
		const e = new Box3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
		expect(e.min).toMatchVector({ x: 0, y: 0, z: 0 });
		expect(e.max).toMatchVector({ x: 1, y: 1, z: 1 });
	});

	it("expandByPoint", () => {
		const e = new Box3();
		e.expandByPoint(new Vector3(1, 2, 3));
		e.expandByPoint(new Vector3(-1, 0, 5));
		expect(e.min).toMatchVector({ x: -1, y: 0, z: 3 });
		expect(e.max).toMatchVector({ x: 1, y: 2, z: 5 });
	});

	it("containsPoint", () => {
		const e = new Box3(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
		expect(e.containsPoint(new Vector3(1, 1, 1))).toBe(true);
		expect(e.containsPoint(new Vector3(3, 1, 1))).toBe(false);
	});

	it("centre getter", () => {
		const e = new Box3(new Vector3(0, 0, 0), new Vector3(4, 4, 4));
		const t = new TBox3(new TVector3(0, 0, 0), new TVector3(4, 4, 4));
		const tc = t.getCenter(new TVector3());
		expect(e.centre).toMatchVector(tc);
	});

	it("size getter", () => {
		const e = new Box3(new Vector3(0, 0, 0), new Vector3(3, 5, 7));
		const t = new TBox3(new TVector3(0, 0, 0), new TVector3(3, 5, 7));
		const ts = t.getSize(new TVector3());
		expect(e.size).toMatchVector(ts);
	});

	it("intersectsBox", () => {
		const e1 = new Box3(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
		const e2 = new Box3(new Vector3(1, 1, 1), new Vector3(3, 3, 3));
		const e3 = new Box3(new Vector3(5, 5, 5), new Vector3(6, 6, 6));
		expect(e1.intersectsBox(e2)).toBe(true);
		expect(e1.intersectsBox(e3)).toBe(false);
	});

	it("union", () => {
		const e1 = new Box3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
		const e2 = new Box3(new Vector3(-1, -1, -1), new Vector3(2, 2, 2));
		e1.union(e2);
		expect(e1.min).toMatchVector({ x: -1, y: -1, z: -1 });
		expect(e1.max).toMatchVector({ x: 2, y: 2, z: 2 });
	});

	it("clone", () => {
		const orig = new Box3(new Vector3(1, 2, 3), new Vector3(4, 5, 6));
		const c = orig.clone();
		expect(c.min).toMatchVector({ x: 1, y: 2, z: 3 });
		c.expandByPoint(new Vector3(10, 10, 10));
		expect(orig.max).toMatchVector({ x: 4, y: 5, z: 6 });
	});

	it("equals", () => {
		const a = new Box3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
		const b = new Box3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
		expect(a.equals(b)).toBe(true);
	});
});
