import { describe } from "bun:test";
import * as THREE from "three";
import { CubicBezierCurve } from "@/curves/curves/CubicBezierCurve.js";
import { Vector2 } from "@/math/Vector2.js";
import { expectCurveParity } from "../../_helpers/curves.js";

describe("CubicBezierCurve vs THREE", () => {
  const ev0 = new Vector2(0, 0);
  const ev1 = new Vector2(1, 2);
  const ev2 = new Vector2(2, 2);
  const ev3 = new Vector2(3, 0);
  const tv0 = new THREE.Vector2(0, 0);
  const tv1 = new THREE.Vector2(1, 2);
  const tv2 = new THREE.Vector2(2, 2);
  const tv3 = new THREE.Vector2(3, 0);
  const EASEL = new CubicBezierCurve(ev0, ev1, ev2, ev3);
  const THREECurve = new THREE.CubicBezierCurve(tv0, tv1, tv2, tv3);

  expectCurveParity(EASEL, THREECurve);
});
