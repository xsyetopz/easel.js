import { describe, expect, it } from "vitest";
import { LineCurve3 } from "@/curves/curves/LineCurve3.js";
import { Vector3 } from "@/math/Vector3.js";
import "../_helpers/assertions.js";

// Use LineCurve3 as a concrete subclass to test Curve base behaviour
describe("Curve base (via LineCurve3)", () => {
	const a = new Vector3(0, 0, 0);
	const b = new Vector3(3, 4, 0);
	const curve = new LineCurve3(a, b);

	it("getLength returns positive value", () => {
		expect(curve.getLength()).toBeCloseTo(5, 4);
	});

	it("getLengths returns array of length arcLengthDivisions+1", () => {
		const lengths = curve.getLengths();
		expect(lengths.length).toBe(curve.arcLengthDivisions + 1);
	});

	it("getLengths caches - second call returns same array reference", () => {
		const first = curve.getLengths();
		const second = curve.getLengths();
		expect(first).toBe(second);
	});

	it("updateArcLengths invalidates cache", () => {
		const first = curve.getLengths();
		curve.updateArcLengths();
		const second = curve.getLengths();
		expect(first).not.toBe(second);
	});

	it("getUtoTmapping(0) returns 0", () => {
		expect(curve.getUtoTmapping(0)).toBeCloseTo(0, 5);
	});

	it("getUtoTmapping(1) returns 1", () => {
		expect(curve.getUtoTmapping(1)).toBeCloseTo(1, 5);
	});

	it("getUtoTmapping(0.5) returns ~0.5 for linear curve", () => {
		expect(curve.getUtoTmapping(0.5)).toBeCloseTo(0.5, 3);
	});

	it("getSpacedPoints returns (divisions+1) points", () => {
		const pts = curve.getSpacedPoints(8);
		expect(pts.length).toBe(9);
	});

	it("getSpacedPoints first point matches curve start", () => {
		const pts = curve.getSpacedPoints(4);
		expect(pts[0]).toMatchVector(a, 1e-6);
	});

	it("getSpacedPoints last point matches curve end", () => {
		const pts = curve.getSpacedPoints(4);
		expect(pts[pts.length - 1]).toMatchVector(b, 1e-6);
	});
});
