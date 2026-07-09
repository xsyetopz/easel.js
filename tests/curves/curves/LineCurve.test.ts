import { describe } from "bun:test";
import * as THREE from "three";
import { LineCurve } from "@/curves/curves/LineCurve.js";
import { Vector2 } from "@/math/Vector2.js";
import { expectCurveParity } from "../../_helpers/curves.js";

describe("LineCurve vs THREE", () => {
	const ev0 = new Vector2(0, 0);
	const ev1 = new Vector2(3, 4);
	const tv0 = new THREE.Vector2(0, 0);
	const tv1 = new THREE.Vector2(3, 4);
	const easel = new LineCurve(ev0, ev1);
	const three = new THREE.LineCurve(tv0, tv1);

	expectCurveParity(easel, three);
});
