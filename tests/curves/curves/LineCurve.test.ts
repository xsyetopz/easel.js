import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LineCurve } from "@/curves/curves/LineCurve.js";
import { Vector2 } from "@/math/Vector2.js";
import "../../_helpers/assertions.js";

describe("LineCurve vs THREE", () => {
	const ev0 = new Vector2(0, 0);
	const ev1 = new Vector2(3, 4);
	const tv0 = new THREE.Vector2(0, 0);
	const tv1 = new THREE.Vector2(3, 4);
	const easel = new LineCurve(ev0, ev1);
	const three = new THREE.LineCurve(tv0, tv1);

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
