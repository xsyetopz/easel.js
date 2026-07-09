import { describe } from "bun:test";
import * as THREE from "three";
import { CubicBezierCurve3 } from "@/curves/curves/CubicBezierCurve3.js";
import { Vector3 } from "@/math/Vector3.js";
import { expectCurveParity } from "../../_helpers/curves.js";

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

	expectCurveParity(easel, three, {
		samples: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0],
	});
});
