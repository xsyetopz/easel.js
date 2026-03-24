import { describe, expect, it } from "vitest";
import "../_helpers/assertions.js";
import { Matrix3 as TMatrix3 } from "three";
import { Matrix3 } from "@/math/Matrix3.js";

describe("Matrix3", () => {
	it("identity on construction", () => {
		const e = new Matrix3();
		const t = new TMatrix3();
		expect(e).toMatchMatrix(t);
	});

	it("set", () => {
		const e = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
		const t = new TMatrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
		expect(e).toMatchMatrix(t);
	});

	it("determinant", () => {
		const e = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
		const t = new TMatrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
		expect(e.determinant()).toBeCloseTo(t.determinant());
	});

	it("determinant of identity is 1", () => {
		expect(new Matrix3().determinant()).toBeCloseTo(1);
	});

	it("invert", () => {
		const e = new Matrix3().set(2, 0, 0, 0, 3, 0, 0, 0, 4);
		const t = new TMatrix3().set(2, 0, 0, 0, 3, 0, 0, 0, 4);
		e.invert();
		t.invert();
		expect(e).toMatchMatrix(t);
	});

	it("invert throws on singular matrix", () => {
		const e = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
		expect(() => e.invert()).toThrow();
	});

	it("transpose", () => {
		const e = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
		const t = new TMatrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
		e.transpose();
		t.transpose();
		expect(e).toMatchMatrix(t);
	});

	it("clone", () => {
		const orig = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
		const c = orig.clone();
		expect(c).toMatchMatrix(orig);
		c.identity();
		expect(orig.elements[1]).not.toBe(c.elements[1]);
	});

	it("mul (post-multiply)", () => {
		const ea = new Matrix3().set(1, 0, 0, 0, 2, 0, 0, 0, 3);
		const eb = new Matrix3().set(4, 0, 0, 0, 5, 0, 0, 0, 6);
		ea.mul(eb);
		const ta = new TMatrix3().set(1, 0, 0, 0, 2, 0, 0, 0, 3);
		const tb = new TMatrix3().set(4, 0, 0, 0, 5, 0, 0, 0, 6);
		ta.multiply(tb);
		expect(ea).toMatchMatrix(ta);
	});
});
