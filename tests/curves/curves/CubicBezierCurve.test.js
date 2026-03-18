import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CubicBezierCurve } from "@/curves/curves/CubicBezierCurve.js";
import { Vector2 } from "@/math/Vector2.js";
import "../../_helpers/assertions.js";

describe("CubicBezierCurve vs THREE", () => {
	const ev0 = new Vector2(0, 0);
	const ev1 = new Vector2(1, 2);
	const ev2 = new Vector2(2, 2);
	const ev3 = new Vector2(3, 0);
	const tv0 = new THREE.Vector2(0, 0);
	const tv1 = new THREE.Vector2(1, 2);
	const tv2 = new THREE.Vector2(2, 2);
	const tv3 = new THREE.Vector2(3, 0);
	const easel = new CubicBezierCurve(ev0, ev1, ev2, ev3);
	const three = new THREE.CubicBezierCurve(tv0, tv1, tv2, tv3);

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
