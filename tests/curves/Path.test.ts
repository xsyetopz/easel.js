import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { Path } from "@/curves/Path.js";
import { Vector2 } from "@/math/Vector2.js";
import "../_helpers/assertions.js";

describe("Path vs THREE", () => {
  describe("moveTo / lineTo", () => {
    it("moveTo sets currentPoint", () => {
      const p = new Path();
      p.moveTo(3, 4);
      expect(p.currentPoint.x).toBe(3);
      expect(p.currentPoint.y).toBe(4);
    });

    it("lineTo adds a curve and updates currentPoint", () => {
      const p = new Path();
      p.moveTo(0, 0).lineTo(2, 0);
      expect(p.curves.length).toBe(1);
      expect(p.currentPoint.x).toBe(2);
    });
  });

  describe("getPoints vs THREE", () => {
    function makeEASEL() {
      const p = new Path();
      p.moveTo(0, 0);
      p.lineTo(2, 0);
      p.quadraticCurveTo(3, 1, 4, 0);
      p.bezierCurveTo(5, -1, 6, -1, 7, 0);
      return p;
    }

    function makeTHREE() {
      const p = new THREE.Path();
      p.moveTo(0, 0);
      p.lineTo(2, 0);
      p.quadraticCurveTo(3, 1, 4, 0);
      p.bezierCurveTo(5, -1, 6, -1, 7, 0);
      return p;
    }

    it("curve count matches", () => {
      expect(makeEASEL().curves.length).toBe(makeTHREE().curves.length);
    });

    // EASEL getPoints returns divisions+1 points; THREE deduplicates segment joins.
    it("getPoints(12) returns divisions+1 points", () => {
      expect(makeEASEL().getPoints(12).length).toBe(13);
    });

    it("getLength matches", () => {
      const diff = Math.abs(makeEASEL().length - makeTHREE().getLength());
      expect(diff).toBeLessThan(1e-3);
    });

    for (const t of [0, 0.5, 1.0]) {
      it(`getPoint(${t}) matches`, () => {
        const ep = makeEASEL().getPoint(t);
        const tp = makeTHREE().getPoint(t);
        expect(ep).toMatchVector(tp, 1e-4);
      });
    }
  });

  describe("setFromPoints", () => {
    it("builds LineCurves from points array", () => {
      const pts = [new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1)];
      const p = new Path(pts);
      expect(p.curves.length).toBe(2);
    });
  });
});
