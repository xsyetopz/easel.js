import { describe } from "bun:test";
import * as THREE from "three";
import { SplineCurve } from "@/curves/curves/SplineCurve.js";
import { Vector2 } from "@/math/Vector2.js";
import { expectCurveParity } from "../../_helpers/curves.js";

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
  const EASEL = new SplineCurve(epts);
  const THREECurve = new THREE.SplineCurve(tpts);

  expectCurveParity(EASEL, THREECurve, { lengthEpsilon: 1e-3 });
});
