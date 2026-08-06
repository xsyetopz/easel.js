import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { CatmullRomCurve3 } from "@/curves/curves/CatmullRomCurve3.js";
import { Vector3 } from "@/math/Vector3.js";
import "../../_helpers/assertions.ts";

const epts = [
  new Vector3(0, 0, 0),
  new Vector3(1, 1, 0),
  new Vector3(2, -1, 0),
  new Vector3(3, 0, 0),
];
const tpts = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(1, 1, 0),
  new THREE.Vector3(2, -1, 0),
  new THREE.Vector3(3, 0, 0),
];

// t=0 matches THREE for all curve types; t=1 for uniform only
// (centripetal/chordal use different arc-length parameterisation near endpoints)
describe("CatmullRomCurve3 endpoints vs THREE", () => {
  for (const curveType of ["centripetal", "chordal", "catmullrom"] as const) {
    it(`${curveType}: t=0 matches`, () => {
      const EASEL = new CatmullRomCurve3(epts, false, curveType, 0.5);
      const THREECurve = new THREE.CatmullRomCurve3(
        tpts,
        false,
        curveType,
        0.5,
      );
      expect(EASEL.getPoint(0)).toMatchVector(THREECurve.getPoint(0), 1e-5);
    });
  }

  it("catmullrom: t=1 matches", () => {
    const EASEL = new CatmullRomCurve3(epts, false, "catmullrom", 0.5);
    const THREECurve = new THREE.CatmullRomCurve3(
      tpts,
      false,
      "catmullrom",
      0.5,
    );
    expect(EASEL.getPoint(1)).toMatchVector(THREECurve.getPoint(1), 1e-5);
  });
});

// Self-consistency tests: curve properties independent of THREE comparison
for (const curveType of ["centripetal", "chordal", "catmullrom"] as const) {
  describe(`CatmullRomCurve3 ${curveType} (self-consistency)`, () => {
    const EASEL = new CatmullRomCurve3(epts, false, curveType, 0.5);

    it("t=0 is at first control point", () => {
      expect(EASEL.getPoint(0)).toMatchVector(epts[0], 1e-5);
    });

    it("midpoint x is between 0 and 3", () => {
      const mid = EASEL.getPoint(0.5);
      expect(mid.x).toBeGreaterThan(0);
      expect(mid.x).toBeLessThan(3);
    });

    it("getLength is positive", () => {
      expect(EASEL.length).toBeGreaterThan(0);
    });

    it("getPoints(10) returns 11 points", () => {
      expect(EASEL.getPoints(10).length).toBe(11);
    });
  });
}

describe("CatmullRomCurve3 closed=true vs THREE (catmullrom)", () => {
  const EASEL = new CatmullRomCurve3(epts, true, "catmullrom", 0.5);
  const THREECurve = new THREE.CatmullRomCurve3(tpts, true, "catmullrom", 0.5);

  it("t=0 matches", () => {
    expect(EASEL.getPoint(0)).toMatchVector(THREECurve.getPoint(0), 1e-5);
  });

  it("t=0.5 matches", () => {
    expect(EASEL.getPoint(0.5)).toMatchVector(THREECurve.getPoint(0.5), 1e-5);
  });

  it("t=1 matches", () => {
    expect(EASEL.getPoint(1)).toMatchVector(THREECurve.getPoint(1), 1e-5);
  });
});
