import * as THREE from "three";
import { describe } from "vitest";
import { QuadraticBezierCurve3 } from "@/curves/curves/QuadraticBezierCurve3.js";
import { Vector3 } from "@/math/Vector3.js";
import { expectCurveParity } from "../../_helpers/curves.js";

describe("QuadraticBezierCurve3 vs THREE", () => {
	const ev0 = new Vector3(0, 0, 0);
	const ev1 = new Vector3(1, 2, 0);
	const ev2 = new Vector3(2, 0, 0);
	const tv0 = new THREE.Vector3(0, 0, 0);
	const tv1 = new THREE.Vector3(1, 2, 0);
	const tv2 = new THREE.Vector3(2, 0, 0);
	const easel = new QuadraticBezierCurve3(ev0, ev1, ev2);
	const three = new THREE.QuadraticBezierCurve3(tv0, tv1, tv2);

	expectCurveParity(easel, three);
});
