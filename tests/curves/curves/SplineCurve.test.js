import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { SplineCurve } from "@/curves/curves/SplineCurve.js";
import { Vector2 } from "@/math/Vector2.js";
import "../../_helpers/assertions.js";

describe("SplineCurve vs THREE", () => {
	const epts = [
		new Vector2(0, 0),
		new Vector2(1, 1),
		new Vector2(2, -1),
		new Vector2(3, 0),
	];
	const tpts = [
		new THREE.Vector2(0, 0),
		new THREE.Vector2(1, 1),
		new THREE.Vector2(2, -1),
		new THREE.Vector2(3, 0),
	];
	const easel = new SplineCurve(epts);
	const three = new THREE.SplineCurve(tpts);

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
