import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.js";
import { Vector3 as TVector3 } from "three";
import { Vector3 } from "@/math/Vector3.js";

describe("Vector3", () => {
	it("constructor defaults", () => {
		const e = new Vector3();
		const t = new TVector3();
		expect(e.x).toBe(t.x);
		expect(e.y).toBe(t.y);
		expect(e.z).toBe(t.z);
	});

	it("set", () => {
		const e = new Vector3().set(1, 2, 3);
		expect(e).toMatchVector({ x: 1, y: 2, z: 3 });
	});

	it("add", () => {
		const e = new Vector3(1, 2, 3).add(new Vector3(4, 5, 6));
		const t = new TVector3(1, 2, 3).add(new TVector3(4, 5, 6));
		expect(e).toMatchVector(t);
	});

	it("sub", () => {
		const e = new Vector3(5, 7, 9).sub(new Vector3(1, 2, 3));
		const t = new TVector3(5, 7, 9).sub(new TVector3(1, 2, 3));
		expect(e).toMatchVector(t);
	});

	it("mulScalar", () => {
		const e = new Vector3(1, 2, 3).mulScalar(3);
		const t = new TVector3(1, 2, 3).multiplyScalar(3);
		expect(e).toMatchVector(t);
	});

	it("divScalar", () => {
		const e = new Vector3(4, 6, 8).divScalar(2);
		const t = new TVector3(4, 6, 8).divideScalar(2);
		expect(e).toMatchVector(t);
	});

	it("length", () => {
		const e = new Vector3(1, 2, 3);
		const t = new TVector3(1, 2, 3);
		expect(e.length).toBeCloseTo(t.length());
	});

	it("lengthSq is getter", () => {
		const e = new Vector3(1, 2, 3);
		const t = new TVector3(1, 2, 3);
		expect(e.lengthSq).toBeCloseTo(t.lengthSq());
	});

	it("normalize", () => {
		const e = new Vector3(3, 0, 0).normalize();
		expect(e.length).toBeCloseTo(1);
	});

	it("dot", () => {
		const e = new Vector3(1, 2, 3);
		const other = new Vector3(4, 5, 6);
		const t = new TVector3(1, 2, 3);
		expect(e.dot(other)).toBeCloseTo(t.dot(new TVector3(4, 5, 6)));
	});

	it("cross", () => {
		const e = new Vector3(1, 0, 0).cross(new Vector3(0, 1, 0));
		const t = new TVector3(1, 0, 0).cross(new TVector3(0, 1, 0));
		expect(e).toMatchVector(t);
	});

	it("crossVectors", () => {
		const a = new Vector3(1, 0, 0);
		const b = new Vector3(0, 1, 0);
		const e = new Vector3().crossVectors(a, b);
		const t = new TVector3().crossVectors(
			new TVector3(1, 0, 0),
			new TVector3(0, 1, 0),
		);
		expect(e).toMatchVector(t);
	});

	it("negate", () => {
		const e = new Vector3(1, -2, 3).negate();
		expect(e).toMatchVector({ x: -1, y: 2, z: -3 });
	});

	it("distanceTo", () => {
		const e = new Vector3(0, 0, 0).distanceTo(new Vector3(3, 4, 0));
		const t = new TVector3(0, 0, 0).distanceTo(new TVector3(3, 4, 0));
		expect(e).toBeCloseTo(t);
	});

	it("lerp", () => {
		const e = new Vector3(0, 0, 0).lerp(new Vector3(10, 10, 10), 0.5);
		const t = new TVector3(0, 0, 0).lerp(new TVector3(10, 10, 10), 0.5);
		expect(e).toMatchVector(t);
	});

	it("clone", () => {
		const orig = new Vector3(1, 2, 3);
		const c = orig.clone();
		expect(c).toMatchVector({ x: 1, y: 2, z: 3 });
		c.set(9, 9, 9);
		expect(orig.x).toBe(1);
	});

	it("equals", () => {
		expect(new Vector3(1, 2, 3).equals(new Vector3(1, 2, 3))).toBe(true);
		expect(new Vector3(1, 2, 3).equals(new Vector3(1, 2, 4))).toBe(false);
	});

	it("fromArray", () => {
		const e = new Vector3().fromArray([7, 8, 9]);
		expect(e).toMatchVector({ x: 7, y: 8, z: 9 });
	});

	it("zero vector normalize returns zero-ish", () => {
		// divScalar(0 || 1) → no NaN
		const e = new Vector3(0, 0, 0).normalize();
		expect(Number.isNaN(e.x)).toBe(false);
	});
});
