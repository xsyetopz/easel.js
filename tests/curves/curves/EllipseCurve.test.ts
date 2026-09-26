import { describe } from "bun:test";
import * as THREE from "three";
import { EllipseCurve } from "@/curves/curves/EllipseCurve.js";
import { expectCurveParity } from "../../_helpers/curves.ts";

describe("EllipseCurve vs THREE", () => {
  // (cx, cy, xRadius, yRadius, startAngle, endAngle, clockwise, rotation)
  const EASEL = new EllipseCurve(0, 0, 2, 1, 0, Math.PI, false, 0);
  const THREECurve = new THREE.EllipseCurve(0, 0, 2, 1, 0, Math.PI, false, 0);

  expectCurveParity(EASEL, THREECurve, { lengthEpsilon: 1e-3 });

  // Replaces the "clockwise (EASEL behaviour)" block, which pinned EASEL's
  // old end-to-start traversal. r186 runs from startAngle in the clockwise
  // direction after normalizing the delta, so every case compares with it.
  const cases: [string, ConstructorParameters<typeof EllipseCurve>][] = [
    ["clockwise, start < end", [0, 0, 2, 1, 0, Math.PI, true, 0]],
    ["counterclockwise, start > end", [1, -1, 1, 1, Math.PI, 0, false, 0]],
    ["clockwise, start > end", [0, 0, 3, 2, 2, 0.5, true, 0]],
    ["full turn, clockwise", [0, 0, 1, 1, 0, Math.PI * 2, true, 0]],
    ["equal angles", [0, 0, 1, 1, 1, 1, true, 0]],
    ["delta above 2PI", [0, 0, 1, 2, -1, 9, false, 0]],
    ["delta below -2PI, clockwise", [0, 0, 1, 2, 9, -1, true, 0]],
    ["rotated, clockwise", [2, 3, 4, 1, 0, Math.PI / 2, true, 0.7]],
  ];
  for (const [name, args] of cases) {
    describe(name, () => {
      expectCurveParity(
        new EllipseCurve(...args),
        new THREE.EllipseCurve(...args),
        { samples: [0, 0.1, 0.25, 0.5, 0.75, 1], lengthEpsilon: 1e-3 },
      );
    });
  }
});
