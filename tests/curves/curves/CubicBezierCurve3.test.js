import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CubicBezierCurve3 } from "@/curves/curves/CubicBezierCurve3.js";
import { Vector3 } from "@/math/Vector3.js";
import "../../_helpers/assertions.js";

describe("CubicBezierCurve3 vs THREE", () => {
	const ev0 = new Vector3(0, 0, 0);
	const ev1 = new Vector3(1, 0, 0);
	const ev2 = new Vector3(1, 1, 0);
	const ev3 = new Vector3(0, 1, 0);
	const tv0 = new THREE.Vector3(0, 0, 0);
	const tv1 = new THREE.Vector3(1, 0, 0);
	const tv2 = new THREE.Vector3(1, 1, 0);
	const tv3 = new THREE.Vector3(0, 1, 0);
	const easel = new CubicBezierCurve3(ev0, ev1, ev2, ev3);
	const three = new THREE.CubicBezierCurve3(tv0, tv1, tv2, tv3);

	for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]) {
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
