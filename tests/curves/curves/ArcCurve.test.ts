import { describe } from "bun:test";
import * as THREE from "three";
import { ArcCurve } from "@/curves/curves/ArcCurve.js";
import { expectCurveParity } from "../../_helpers/curves.js";

describe("ArcCurve vs THREE", () => {
  // (cx, cy, radius, startAngle, endAngle, clockwise)
  const easel = new ArcCurve(0, 0, 3, 0, Math.PI * 1.5, false);
  const three = new THREE.ArcCurve(0, 0, 3, 0, Math.PI * 1.5, false);

  expectCurveParity(easel, three, { lengthEpsilon: 1e-3 });
});
