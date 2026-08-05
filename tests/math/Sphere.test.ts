import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.js";
import {
  Box3 as TBox3,
  Matrix4 as TMatrix4,
  Plane as TPlane,
  Sphere as TSphere,
  Vector3 as TVector3,
} from "three";
import { Box3 } from "@/math/Box3.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { Plane } from "@/math/Plane.js";
import { Sphere } from "@/math/Sphere.js";
import { Vector3 } from "@/math/Vector3.js";

type THREESphereParity = TSphere & {
  applyMatrix4(matrix: TMatrix4): THREESphereParity;
  getBoundingBox(target: TBox3): TBox3;
  intersectsBox(box: TBox3): boolean;
  intersectsPlane(plane: TPlane): boolean;
  union(sphere: TSphere): THREESphereParity;
};

describe("Sphere", () => {
  it("constructor defaults", () => {
    const e = new Sphere();
		// EASEL: centre, THREE: center
    expect(e.centre.x).toBe(0);
    expect(e.centre.y).toBe(0);
    expect(e.centre.z).toBe(0);
    expect(e.radius).toBe(1);
    expect(e.center).toBe(e.centre);
    expect(e.isSphere).toBe(true);
    expect(e.isEmpty).toBe(false);
  });

  it("set via properties", () => {
    const e = new Sphere();
    e.centre = new Vector3(1, 2, 3);
    e.radius = 5;
    expect(e.centre).toMatchVector({ x: 1, y: 2, z: 3 });
    expect(e.radius).toBe(5);
    e.center = new Vector3(4, 5, 6);
    expect(e.centre).toMatchVector({ x: 4, y: 5, z: 6 });
    expect(e.set(new Vector3(7, 8, 9), 2)).toBe(e);
    expect(e.center).toMatchVector({ x: 7, y: 8, z: 9 });
    expect(e.radius).toBe(2);
  });

  it("empty state", () => {
    const e = new Sphere().makeEmpty();
    expect(e.isEmpty).toBe(true);
    expect(e.radius).toBe(-1);
    expect(e.center).toMatchVector({ x: 0, y: 0, z: 0 });

    const target = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
    e.getBoundingBox(target);
    expect(target.isEmpty).toBe(true);
  });

  it("containsPoint inside", () => {
    const e = new Sphere(new Vector3(0, 0, 0), 5);
    expect(e.containsPoint(new Vector3(1, 1, 1))).toBe(true);
    expect(e.containsPoint(new Vector3(10, 0, 0))).toBe(false);
  });

  it("intersectsSphere overlapping", () => {
    const a = new Sphere(new Vector3(0, 0, 0), 2);
    const b = new Sphere(new Vector3(1, 0, 0), 2);
    const c = new Sphere(new Vector3(10, 0, 0), 1);
    expect(a.intersectsSphere(b)).toBe(true);
    expect(a.intersectsSphere(c)).toBe(false);
  });

  it("distanceToPoint", () => {
    const e = new Sphere(new Vector3(0, 0, 0), 1);
    const t = new TSphere(new TVector3(0, 0, 0), 1);
    const ep = new Vector3(3, 0, 0);
    const tp = new TVector3(3, 0, 0);
    expect(e.distanceToPoint(ep)).toBeCloseTo(t.distanceToPoint(tp));
  });

  it("clampPoint writes the supplied target", () => {
    const e = new Sphere(new Vector3(1, 2, 3), 2);
    const target = new Vector3();
    expect(e.clampPoint(new Vector3(1, 2, 3), target)).toBe(target);
    expect(target).toMatchVector({ x: 1, y: 2, z: 3 });
    e.clampPoint(new Vector3(5, 2, 3), target);
    expect(target).toMatchVector({ x: 3, y: 2, z: 3 });

    const empty = new Sphere().makeEmpty();
    empty.clampPoint(new Vector3(4, 5, 6), target);
    expect(target).toMatchVector({ x: 4, y: 5, z: 6 });
  });

  it("getBoundingBox", () => {
    const e = new Sphere(new Vector3(1, 2, 3), 2);
    const t = new TSphere(new TVector3(1, 2, 3), 2) as THREESphereParity;
    const eb = e.getBoundingBox(new Box3());
    const tb = t.getBoundingBox(new TBox3());
    expect(eb.min).toMatchVector(tb.min);
    expect(eb.max).toMatchVector(tb.max);
  });

  it("applyMatrix4 scales by the largest basis axis", () => {
    const eMatrix = new Matrix4().makeScale(2, 3, 4);
    eMatrix.elements[12] = 5;
    eMatrix.elements[13] = -2;
    eMatrix.elements[14] = 1;
    const tMatrix = new TMatrix4().makeScale(2, 3, 4);
    tMatrix.elements[12] = 5;
    tMatrix.elements[13] = -2;
    tMatrix.elements[14] = 1;

    const e = new Sphere(new Vector3(1, 2, 3), 2).applyMatrix4(eMatrix);
    const t = (
      new TSphere(new TVector3(1, 2, 3), 2) as THREESphereParity
    ).applyMatrix4(tMatrix);
    expect(e.center).toMatchVector(t.center);
    expect(e.radius).toBeCloseTo(t.radius);
  });

  it("intersects boxes and planes", () => {
    const e = new Sphere(new Vector3(0, 0, 0), 1);
    const box = new Box3(
      new Vector3(0.5, -0.5, -0.5),
      new Vector3(2, 0.5, 0.5),
    );
    const plane = new Plane(new Vector3(1, 0, 0), -1);
    const t = new TSphere(new TVector3(0, 0, 0), 1) as THREESphereParity;
    const tb = new TBox3(
      new TVector3(0.5, -0.5, -0.5),
      new TVector3(2, 0.5, 0.5),
    );
    const tp = new TPlane(new TVector3(1, 0, 0), -1);
    expect(e.intersectsBox(box)).toBe(t.intersectsBox(tb));
    expect(e.intersectsPlane(plane)).toBe(t.intersectsPlane(tp));
  });

  it("clone", () => {
    const orig = new Sphere(new Vector3(1, 2, 3), 4);
    const c = orig.clone();
    expect(c.centre).toMatchVector({ x: 1, y: 2, z: 3 });
    expect(c.radius).toBe(4);
    c.centre = new Vector3(9, 9, 9);
    c.radius = 9;
    expect(orig.radius).toBe(4);
  });

  it("equals", () => {
    const a = new Sphere(new Vector3(1, 2, 3), 4);
    const b = new Sphere(new Vector3(1, 2, 3), 4);
    expect(a.equals(b)).toBe(true);
  });

  it("union computes a conservative enclosing sphere", () => {
    const e = new Sphere(new Vector3(0, 0, 0), 1).union(
      new Sphere(new Vector3(4, 0, 0), 1),
    );
    const t = (
      new TSphere(new TVector3(0, 0, 0), 1) as THREESphereParity
    ).union(new TSphere(new TVector3(4, 0, 0), 1));
    expect(e.center).toMatchVector(t.center);
    expect(e.radius).toBeCloseTo(t.radius);

    const empty = new Sphere().makeEmpty();
    expect(empty.union(e)).toBe(empty);
    expect(empty.equals(e)).toBe(true);
  });

  it("JSON round trip", () => {
    const e = new Sphere(new Vector3(1, 2, 3), 4);
    const restored = new Sphere().fromJSON(e.toJSON());
    expect(restored.equals(e)).toBe(true);
  });
});
