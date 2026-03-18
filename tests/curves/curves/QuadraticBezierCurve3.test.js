import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { QuadraticBezierCurve3 } from "@/curves/curves/QuadraticBezierCurve3.js";
import { Vector3 } from "@/math/Vector3.js";
import "../../_helpers/assertions.js";

describe("QuadraticBezierCurve3 vs THREE", () => {
	const ev0 = new Vector3(0, 0, 0);
	const ev1 = new Vector3(1, 2, 0);
	const ev2 = new Vector3(2, 0, 0);
	const tv0 = new THREE.Vector3(0, 0, 0);
	const tv1 = new THREE.Vector3(1, 2, 0);
	const tv2 = new THREE.Vector3(2, 0, 0);
	const easel = new QuadraticBezierCurve3(ev0, ev1, ev2);
	const three = new THREE.QuadraticBezierCurve3(tv0, tv1, tv2);

	for (const t of [0, 0.25, 0.5, 0.75, 1.0]) {
		it(`getPoint(${t}) matches`, () => {
			const ep = easel.getPoint(t);
			const tp = three.getPoint(t);
			expect(ep).toMatchVector(tp, 1e-6);
		});
	}

	it("getLength matches", () => {
		expect(Math.abs(easel.getLength() - three.getLength())).toBeLessThan(1e-4);
	});

	it("getPoints(10) count matches", () => {
		expect(easel.getPoints(10).length).toBe(three.getPoints(10).length);
	});
});
