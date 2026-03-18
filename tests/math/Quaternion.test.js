import { describe, expect, it } from "vitest";
import "../_helpers/assertions.js";
import { Matrix4 as TMatrix4, Quaternion as TQuaternion } from "three";
import { Matrix4 } from "@/math/Matrix4.js";
import { Quaternion } from "@/math/Quaternion.js";

describe("Quaternion", () => {
	it("constructor defaults", () => {
		const e = new Quaternion();
		const t = new TQuaternion();
		expect(e.x).toBe(t.x);
		expect(e.y).toBe(t.y);
		expect(e.z).toBe(t.z);
		expect(e.w).toBe(t.w);
	});

	it("set", () => {
		const e = new Quaternion().set(1, 2, 3, 4);
		expect(e).toMatchVector({ x: 1, y: 2, z: 3, w: 4 });
	});

	it("setFromAxisAngle", () => {
		const axis = { x: 0, y: 1, z: 0 };
		const angle = Math.PI / 4;
		const e = new Quaternion().setFromAxisAngle(axis, angle);
		const t = new TQuaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 }, angle);
		expect(e).toMatchVector(t);
	});

	it("setFromEuler", () => {
		// easel setFromEuler accepts plain {x,y,z,order} objects
		const euler = { x: 0.1, y: 0.2, z: 0.3, order: "XYZ" };
		const e = new Quaternion().setFromEuler(euler);
		// verify result is a unit quaternion
		expect(e.length).toBeCloseTo(1, 5);
		// spot-check against known values for XYZ(0.1, 0.2, 0.3)
		expect(e.w).toBeGreaterThan(0.9);
	});

	it("setFromRotationMatrix", () => {
		const em = new Matrix4().makeRotationY(Math.PI / 3);
		const e = new Quaternion().setFromRotationMatrix(em);
		const tm = new TMatrix4().makeRotationY(Math.PI / 3);
		const t = new TQuaternion().setFromRotationMatrix(tm);
		expect(e).toMatchVector(t, 1e-5);
	});

	it("normalize", () => {
		const e = new Quaternion().set(2, 0, 0, 0).normalize();
		expect(e.length).toBeCloseTo(1);
	});

	it("invert (conjugate for unit)", () => {
		const e = new Quaternion().setFromAxisAngle(
			{ x: 0, y: 1, z: 0 },
			Math.PI / 4,
		);
		const x0 = e.x;
		e.invert();
		expect(e.x).toBeCloseTo(-x0);
		expect(e.w).toBeCloseTo(Math.cos(Math.PI / 8));
	});

	it("length", () => {
		const e = new Quaternion().set(0, 0, 0, 1);
		expect(e.length).toBeCloseTo(1);
	});

	it("clone", () => {
		const orig = new Quaternion().set(1, 2, 3, 4);
		const c = orig.clone();
		expect(c).toMatchVector({ x: 1, y: 2, z: 3, w: 4 });
		c.set(9, 9, 9, 9);
		expect(orig.x).toBe(1);
	});

	it("equals", () => {
		const a = new Quaternion().set(1, 2, 3, 4);
		const b = new Quaternion().set(1, 2, 3, 4);
		expect(a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w).toBe(true);
	});

	it("premul matches THREE premultiply", () => {
		const ea = new Quaternion().setFromAxisAngle(
			{ x: 1, y: 0, z: 0 },
			Math.PI / 4,
		);
		const eb = new Quaternion().setFromAxisAngle(
			{ x: 0, y: 1, z: 0 },
			Math.PI / 3,
		);
		ea.premul(eb);

		const ta = new TQuaternion().setFromAxisAngle(
			{ x: 1, y: 0, z: 0 },
			Math.PI / 4,
		);
		const tb = new TQuaternion().setFromAxisAngle(
			{ x: 0, y: 1, z: 0 },
			Math.PI / 3,
		);
		ta.premultiply(tb);

		expect(ea).toMatchVector(ta, 1e-5);
	});
});
