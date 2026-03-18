import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { EllipseCurve } from "@/curves/curves/EllipseCurve.js";
import "../../_helpers/assertions.js";

describe("EllipseCurve vs THREE", () => {
	// (cx, cy, xRadius, yRadius, startAngle, endAngle, clockwise, rotation)
	const easel = new EllipseCurve(0, 0, 2, 1, 0, Math.PI, false, 0);
	const three = new THREE.EllipseCurve(0, 0, 2, 1, 0, Math.PI, false, 0);

	for (const t of [0, 0.25, 0.5, 0.75, 1.0]) {
		it(`getPoint(${t}) matches`, () => {
			const ep = easel.getPoint(t);
			const tp = three.getPoint(t);
			expect(ep).toMatchVector(tp, 1e-6);
		});
	}

	it("getLength matches", () => {
		expect(Math.abs(easel.getLength() - three.getLength())).toBeLessThan(1e-3);
	});

	it("getPoints(10) count matches", () => {
		expect(easel.getPoints(10).length).toBe(three.getPoints(10).length);
	});

	// Clockwise traversal: easel reverses angle direction (endAngle → startAngle),
	// while THREE.js swaps start/end. The implementations differ intentionally.
	describe("clockwise (easel behaviour)", () => {
		const eC = new EllipseCurve(0, 0, 2, 1, 0, Math.PI, true, 0);
		it("t=0 starts at endAngle (PI)", () => {
			// clockwise=true means start at endAngle, so cos(PI)=-1, sin(PI)=0
			const p = eC.getPoint(0);
			expect(p.x).toBeCloseTo(-2, 5);
			expect(p.y).toBeCloseTo(0, 5);
		});
		it("t=1 ends at startAngle (0)", () => {
			// clockwise=true means end at startAngle, so cos(0)=1, sin(0)=0
			const p = eC.getPoint(1);
			expect(p.x).toBeCloseTo(2, 5);
			expect(p.y).toBeCloseTo(0, 5);
		});
	});
});
