import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { ArcCurve } from "@/curves/curves/ArcCurve.js";
import "../../_helpers/assertions.js";

describe("ArcCurve vs THREE", () => {
	// (cx, cy, radius, startAngle, endAngle, clockwise)
	const easel = new ArcCurve(0, 0, 3, 0, Math.PI * 1.5, false);
	const three = new THREE.ArcCurve(0, 0, 3, 0, Math.PI * 1.5, false);

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
});
