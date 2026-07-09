import { describe } from "bun:test";
import * as THREE from "three";
import { QuadraticBezierCurve } from "@/curves/curves/QuadraticBezierCurve.js";
import { Vector2 } from "@/math/Vector2.js";
import { expectCurveParity } from "../../_helpers/curves.js";

describe("QuadraticBezierCurve vs THREE", () => {
	const ev0 = new Vector2(0, 0);
	const ev1 = new Vector2(1, 2);
	const ev2 = new Vector2(2, 0);
	const tv0 = new THREE.Vector2(0, 0);
	const tv1 = new THREE.Vector2(1, 2);
	const tv2 = new THREE.Vector2(2, 0);
	const easel = new QuadraticBezierCurve(ev0, ev1, ev2);
	const three = new THREE.QuadraticBezierCurve(tv0, tv1, tv2);

	expectCurveParity(easel, three);
});
