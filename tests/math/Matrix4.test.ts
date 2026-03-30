import { describe, expect, it } from "vitest";
import "../_helpers/assertions.js";
import {
	Matrix4 as TMatrix4,
	Quaternion as TQuaternion,
	Vector3 as TVector3,
} from "three";
import { Matrix4 } from "@/math/Matrix4.js";
import { Quaternion } from "@/math/Quaternion.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Matrix4", () => {
	it("identity on construction", () => {
		const e = new Matrix4();
		const t = new TMatrix4();
		expect(e).toMatchMatrix(t);
	});

	it("determinant of identity is 1", () => {
		expect(new Matrix4().determinant()).toBeCloseTo(1);
	});

	it("invert identity gives identity", () => {
		const e = new Matrix4().invert();
		expect(e).toMatchMatrix(new TMatrix4());
	});

	it("transpose", () => {
		const e = new Matrix4();
		const t = new TMatrix4();
		e.elements[1] = 5;
		t.elements[1] = 5;
		e.transpose();
		t.transpose();
		expect(e).toMatchMatrix(t);
	});

	it("makeTranslation", () => {
		const e = new Matrix4().makeTranslation(1, 2, 3);
		const t = new TMatrix4().makeTranslation(1, 2, 3);
		expect(e).toMatchMatrix(t);
	});

	it("makeScale", () => {
		const e = new Matrix4().makeScale(2, 3, 4);
		const t = new TMatrix4().makeScale(2, 3, 4);
		expect(e).toMatchMatrix(t);
	});

	it("makeRotationX", () => {
		const angle = Math.PI / 4;
		const e = new Matrix4().makeRotationX(angle);
		const t = new TMatrix4().makeRotationX(angle);
		expect(e).toMatchMatrix(t);
	});

	it("makeRotationY", () => {
		const angle = Math.PI / 3;
		const e = new Matrix4().makeRotationY(angle);
		const t = new TMatrix4().makeRotationY(angle);
		expect(e).toMatchMatrix(t);
	});

	it("makeRotationZ", () => {
		const angle = Math.PI / 6;
		const e = new Matrix4().makeRotationZ(angle);
		const t = new TMatrix4().makeRotationZ(angle);
		expect(e).toMatchMatrix(t);
	});

	it("mul", () => {
		const ea = new Matrix4().makeTranslation(1, 2, 3);
		const eb = new Matrix4().makeScale(2, 2, 2);
		ea.mul(eb);
		const ta = new TMatrix4().makeTranslation(1, 2, 3);
		const tb = new TMatrix4().makeScale(2, 2, 2);
		ta.multiply(tb);
		expect(ea).toMatchMatrix(ta);
	});

	it("mulMatrices", () => {
		const a = new Matrix4().makeRotationX(Math.PI / 2);
		const b = new Matrix4().makeTranslation(1, 0, 0);
		const e = new Matrix4().mulMatrices(a, b);
		const ta = new TMatrix4().makeRotationX(Math.PI / 2);
		const tb = new TMatrix4().makeTranslation(1, 0, 0);
		const t = new TMatrix4().multiplyMatrices(ta, tb);
		expect(e).toMatchMatrix(t);
	});

	it("mulMatricesAffine matches mulMatrices for affine inputs", () => {
		const posA = new Vector3(1, 2, 3);
		const qA = new Quaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 }, 0.7);
		const sA = new Vector3(2, 1, 3);
		const a = new Matrix4().compose(posA, qA, sA);

		const posB = new Vector3(-4, 0.5, 2);
		const qB = new Quaternion().setFromAxisAngle({ x: 1, y: 0, z: 0 }, -0.2);
		const sB = new Vector3(1, 2, 1);
		const b = new Matrix4().compose(posB, qB, sB);

		const eAffine = new Matrix4().mulMatricesAffine(a, b);
		const eFull = new Matrix4().mulMatrices(a, b);
		expect(eAffine).toMatchMatrix(eFull);
	});

	it("compose / decompose round-trip", () => {
		const pos = new Vector3(1, 2, 3);
		const q = new Quaternion().setFromAxisAngle(
			{ x: 0, y: 1, z: 0 },
			Math.PI / 4,
		);
		const scale = new Vector3(2, 2, 2);
		const m = new Matrix4().compose(pos, q, scale);

		const pos2 = new Vector3();
		const q2 = new Quaternion();
		const scale2 = new Vector3();
		m.decompose(pos2, q2, scale2);

		expect(pos2).toMatchVector(pos, 1e-5);
		expect(scale2).toMatchVector(scale, 1e-5);
	});

	it("compose matches THREE for axis-only quaternions", () => {
		const pos = new Vector3(1.5, -2, 3);
		const scale = new Vector3(2, 3, 4);
		const tPos = new TVector3(pos.x, pos.y, pos.z);
		const tScale = new TVector3(scale.x, scale.y, scale.z);

		const axes = [
			{ x: 1, y: 0, z: 0 },
			{ x: 0, y: 1, z: 0 },
			{ x: 0, y: 0, z: 1 },
		];
		const angles = [0, 0.3, -1.2, Math.PI / 2];
		for (const axis of axes) {
			for (const angle of angles) {
				const q = new Quaternion().setFromAxisAngle(axis, angle);
				const tq = new TQuaternion().setFromAxisAngle(axis, angle);
				const e = new Matrix4().compose(pos, q, scale);
				const t = new TMatrix4().compose(tPos, tq, tScale);
				expect(e).toMatchMatrix(t, 1e-6);
			}
		}
	});

	it("clone", () => {
		const orig = new Matrix4().makeTranslation(5, 6, 7);
		const c = orig.clone();
		expect(c).toMatchMatrix(orig);
		c.identity();
		expect(orig.elements[12]).toBe(5);
	});

	it("makeOrthographic", () => {
		const e = new Matrix4().makeOrthographic(-1, 1, 1, -1, 0.1, 100);
		const t = new TMatrix4().makeOrthographic(-1, 1, 1, -1, 0.1, 100);
		expect(e).toMatchMatrix(t);
	});
});
