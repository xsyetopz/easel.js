import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import { Triangle as TTriangle, Vector3 as TVector3 } from "three";
import {
  interpolateTriangle,
  isTriangleFrontFacing,
  Triangle,
  triangleBarycoord,
  triangleContainsPoint,
  triangleNormal,
} from "@/math/Triangle.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Triangle", () => {
  const ea = new Vector3(0, 0, 0);
  const eb = new Vector3(1, 0, 0);
  const ec = new Vector3(0, 1, 0);

  it("constructor defaults", () => {
    const e = new Triangle();
    const t = new TTriangle();
    expect(e.a).toMatchVector(t.a);
    expect(e.b).toMatchVector(t.b);
    expect(e.c).toMatchVector(t.c);
  });

  it("set", () => {
    const e = new Triangle().set(ea, eb, ec);
    expect(e.a).toMatchVector({ x: 0, y: 0, z: 0 });
    expect(e.b).toMatchVector({ x: 1, y: 0, z: 0 });
    expect(e.c).toMatchVector({ x: 0, y: 1, z: 0 });
  });

  it("getArea", () => {
    const e = new Triangle(ea, eb, ec);
    const t = new TTriangle(
      new TVector3(0, 0, 0),
      new TVector3(1, 0, 0),
      new TVector3(0, 1, 0),
    );
    expect(e.area).toBeCloseTo(t.getArea());
  });

  it("getMidpoint", () => {
    const e = new Triangle(ea, eb, ec);
    const t = new TTriangle(
      new TVector3(0, 0, 0),
      new TVector3(1, 0, 0),
      new TVector3(0, 1, 0),
    );
    const ep = e.getMidpoint(new Vector3());
    const tp = t.getMidpoint(new TVector3());
    expect(ep).toMatchVector(tp);
  });

  it("getNormal is unit vector perpendicular to triangle plane", () => {
    const e = new Triangle(ea, eb, ec);
    const en = e.getNormal(new Vector3());
    // The triangle lies in the XY plane, so normal is along Z axis (unit length)
    expect(Math.abs(en.z)).toBeCloseTo(1);
    expect(en.x).toBeCloseTo(0);
    expect(en.y).toBeCloseTo(0);
    // Note: EASEL uses opposite winding to THREE so sign may differ
  });

  it("containsPoint", () => {
    const e = new Triangle(ea, eb, ec);
    expect(e.containsPoint(new Vector3(0.2, 0.2, 0))).toBe(true);
    expect(e.containsPoint(new Vector3(1, 1, 0))).toBe(false);
  });

  it("getBarycoord", () => {
    const e = new Triangle(ea, eb, ec);
    const t = new TTriangle(
      new TVector3(0, 0, 0),
      new TVector3(1, 0, 0),
      new TVector3(0, 1, 0),
    );
    const point = new Vector3(0.25, 0.25, 0);
    const ep = e.getBarycoord(point, new Vector3());
    const tp = t.getBarycoord(new TVector3(0.25, 0.25, 0), new TVector3());
    expect(ep).toMatchVector(tp, 1e-5);
  });

  it("provides top-level triangle operations", () => {
    const point = new Vector3(0.25, 0.25, 0);
    expect(triangleBarycoord(point, ea, eb, ec)).toMatchVector({
      x: 0.5,
      y: 0.25,
      z: 0.25,
    });
    expect(triangleContainsPoint(point, ea, eb, ec)).toBe(true);
    expect(interpolateTriangle(point, ea, eb, ec, ea, eb, ec)).toMatchVector(
      point,
    );
    expect(triangleNormal(ea, eb, ec).length).toBeCloseTo(1);
    expect(isTriangleFrontFacing(ea, eb, ec, new Vector3(0, 0, -1))).toBe(true);
  });

  it("matches THREE.js for closest points outside every edge", () => {
    const EASEL = new Triangle(ea, eb, ec);
    const THREE = new TTriangle(
      new TVector3(0, 0, 0),
      new TVector3(1, 0, 0),
      new TVector3(0, 1, 0),
    );
    for (const point of [
      new Vector3(-1, 0.25, 0),
      new Vector3(0.25, -1, 0),
      new Vector3(1, 1, 0),
    ]) {
      const actual = EASEL.closestPointToPoint(point);
      const expected = THREE.closestPointToPoint(
        new TVector3(point.x, point.y, point.z),
        new TVector3(),
      );
      expect(actual).toMatchVector(expected);
    }
  });

  it("clone", () => {
    const orig = new Triangle(ea, eb, ec);
    const c = orig.clone();
    expect(c.a).toMatchVector({ x: 0, y: 0, z: 0 });
    c.a.set(9, 9, 9);
    expect(orig.a.x).toBe(0);
  });

  it("equals", () => {
    const a = new Triangle(ea, eb, ec);
    const b = new Triangle(
      new Vector3(0, 0, 0),
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
    );
    expect(a.equals(b)).toBe(true);
  });
});
