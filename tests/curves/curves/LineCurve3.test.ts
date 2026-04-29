import * as THREE from "three";
import { describe } from "vitest";
import { LineCurve3 } from "@/curves/curves/LineCurve3.js";
import { Vector3 } from "@/math/Vector3.js";
import { expectCurveParity } from "../../_helpers/curves.js";

describe("LineCurve3 vs THREE", () => {
	const ev0 = new Vector3(0, 0, 0);
	const ev1 = new Vector3(1, 2, 3);
	const tv0 = new THREE.Vector3(0, 0, 0);
	const tv1 = new THREE.Vector3(1, 2, 3);
	const easel = new LineCurve3(ev0, ev1);
	const three = new THREE.LineCurve3(tv0, tv1);

	expectCurveParity(easel, three);
});
