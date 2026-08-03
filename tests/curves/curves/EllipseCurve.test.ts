import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { EllipseCurve } from "@/curves/curves/EllipseCurve.js";
import { expectCurveParity } from "../../_helpers/curves.js";

describe("EllipseCurve vs THREE", () => {
  // (cx, cy, xRadius, yRadius, startAngle, endAngle, clockwise, rotation)
  const easel = new EllipseCurve(0, 0, 2, 1, 0, Math.PI, false, 0);
  const three = new THREE.EllipseCurve(0, 0, 2, 1, 0, Math.PI, false, 0);

  expectCurveParity(easel, three, { lengthEpsilon: 1e-3 });

  // Clockwise traversal: easel reverses angle direction (endAngle → startAngle),
  // while THREE.js swaps start/end. The implementations differ intentionally.
  describe("clockwise (easel behaviour)", () => {
    const eC = new EllipseCurve(0, 0, 2, 1, 0, Math.PI, true, 0);
    it("t=0 starts at endAngle (PI)", () => {
      // clockwise=true means start at endAngle, so cos(PI)=-1, sin(PI)=0
      const p = eC.getPoint(0);
      expect(p.x).toBeCloseTo(-2, 5);
      expect(p.y).toBeCloseTo(0, 5);
    });
    it("t=1 ends at startAngle (0)", () => {
      // clockwise=true means end at startAngle, so cos(0)=1, sin(0)=0
      const p = eC.getPoint(1);
      expect(p.x).toBeCloseTo(2, 5);
      expect(p.y).toBeCloseTo(0, 5);
    });
  });
});
