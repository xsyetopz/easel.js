import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { CurvePath } from "@/curves/CurvePath.js";
import { LineCurve } from "@/curves/curves/LineCurve.js";
import { QuadraticBezierCurve } from "@/curves/curves/QuadraticBezierCurve.js";
import { Vector2 } from "@/math/Vector2.js";
import { expectCurveParity } from "../_helpers/curves.ts";

function makeEASELPath() {
  const path = new CurvePath();
  path.add(new LineCurve(new Vector2(0, 0), new Vector2(2, 0)));
  path.add(
    new QuadraticBezierCurve(
      new Vector2(2, 0),
      new Vector2(3, 1),
      new Vector2(4, 0),
    ),
  );
  return path;
}

function makeTHREEPath() {
  const path = new THREE.CurvePath();
  path.add(
    new THREE.LineCurve(new THREE.Vector2(0, 0), new THREE.Vector2(2, 0)),
  );
  path.add(
    new THREE.QuadraticBezierCurve(
      new THREE.Vector2(2, 0),
      new THREE.Vector2(3, 1),
      new THREE.Vector2(4, 0),
    ),
  );
  return path;
}

describe("CurvePath vs THREE", () => {
  const EASEL = makeEASELPath();
  const THREE = makeTHREEPath();

  expectCurveParity(EASEL, THREE, {
    pointEpsilon: 1e-4,
    lengthEpsilon: 1e-3,
    pointsDivisions: false,
  });

  // EASEL getPoints returns divisions+1 points; THREE deduplicates segment joins.
  it("getPoints(12) returns divisions+1 points", () => {
    expect(EASEL.getPoints(12).length).toBe(13);
  });

  it("getCurveLengths returns cumulative array with correct length", () => {
    const lens = EASEL.curveLengths;
    expect(lens.length).toBe(2);
    expect(lens[1]).toBeCloseTo(EASEL.length, 5);
  });

  it("reuses curve length cache until path changes", () => {
    const path = makeEASELPath();
    const first = path.curveLengths;
    const second = path.curveLengths;
    expect(second).toBe(first);
    path.add(new LineCurve(new Vector2(4, 0), new Vector2(5, 0)));
    const third = path.curveLengths;
    expect(third).not.toBe(first);
    expect(third.length).toBe(3);
    expect(third[2]).toBeCloseTo(path.length, 5);
  });

  it("updateArcLengths invalidates cached path lengths", () => {
    const path = makeEASELPath();
    const first = path.curveLengths;
    path.updateArcLengths();
    const second = path.curveLengths;
    expect(second).not.toBe(first);
    expect(second.length).toBe(2);
    expect(second[1]).toBeCloseTo(path.length, 5);
  });

  describe("closePath", () => {
    it("closes open path by adding LineCurve", () => {
      const p = makeEASELPath();
      const before = p.curves.length;
      p.closePath();
      expect(p.curves.length).toBe(before + 1);
    });

    it("does not add segment if already closed", () => {
      const p = new CurvePath();
      p.add(new LineCurve(new Vector2(0, 0), new Vector2(1, 0)));
      p.add(new LineCurve(new Vector2(1, 0), new Vector2(0, 0)));
      p.closePath();
      expect(p.curves.length).toBe(2);
    });
  });
});
