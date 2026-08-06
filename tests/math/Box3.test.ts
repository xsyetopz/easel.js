import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import {
  Box3 as TBox3,
  Matrix4 as TMatrix4,
  Plane as TPlane,
  Sphere as TSphere,
  Triangle as TTriangle,
  Vector3 as TVector3,
} from "three";
import { Box3 } from "@/math/Box3.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { Plane } from "@/math/Plane.js";
import { Sphere } from "@/math/Sphere.js";
import { Triangle } from "@/math/Triangle.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Box3", () => {
  it("constructor defaults to empty box", () => {
    const e = new Box3();
    expect(e.isBox3).toBe(true);
    expect(e.min.x).toBe(Number.POSITIVE_INFINITY);
    expect(e.max.x).toBe(Number.NEGATIVE_INFINITY);
  });

  it("set via constructor", () => {
    const e = new Box3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
    expect(e.min).toMatchVector({ x: 0, y: 0, z: 0 });
    expect(e.max).toMatchVector({ x: 1, y: 1, z: 1 });
  });

  it("expandByPoint", () => {
    const e = new Box3();
    e.expandByPoint(new Vector3(1, 2, 3));
    e.expandByPoint(new Vector3(-1, 0, 5));
    expect(e.min).toMatchVector({ x: -1, y: 0, z: 3 });
    expect(e.max).toMatchVector({ x: 1, y: 2, z: 5 });
  });

  it("containsPoint", () => {
    const e = new Box3(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
    expect(e.containsPoint(new Vector3(1, 1, 1))).toBe(true);
    expect(e.containsPoint(new Vector3(3, 1, 1))).toBe(false);
  });

  it("centre getter", () => {
    const e = new Box3(new Vector3(0, 0, 0), new Vector3(4, 4, 4));
    const t = new TBox3(new TVector3(0, 0, 0), new TVector3(4, 4, 4));
    const tc = t.getCenter(new TVector3());
    expect(e.centre).toMatchVector(tc);
  });

  it("size getter", () => {
    const e = new Box3(new Vector3(0, 0, 0), new Vector3(3, 5, 7));
    const t = new TBox3(new TVector3(0, 0, 0), new TVector3(3, 5, 7));
    const ts = t.getSize(new TVector3());
    expect(e.size).toMatchVector(ts);
  });

  it("intersectsBox", () => {
    const e1 = new Box3(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
    const e2 = new Box3(new Vector3(1, 1, 1), new Vector3(3, 3, 3));
    const e3 = new Box3(new Vector3(5, 5, 5), new Vector3(6, 6, 6));
    expect(e1.intersectsBox(e2)).toBe(true);
    expect(e1.intersectsBox(e3)).toBe(false);
  });

  it("union", () => {
    const e1 = new Box3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
    const e2 = new Box3(new Vector3(-1, -1, -1), new Vector3(2, 2, 2));
    e1.union(e2);
    expect(e1.min).toMatchVector({ x: -1, y: -1, z: -1 });
    expect(e1.max).toMatchVector({ x: 2, y: 2, z: 2 });
  });

  it("clone", () => {
    const orig = new Box3(new Vector3(1, 2, 3), new Vector3(4, 5, 6));
    const c = orig.clone();
    expect(c.min).toMatchVector({ x: 1, y: 2, z: 3 });
    c.expandByPoint(new Vector3(10, 10, 10));
    expect(orig.max).toMatchVector({ x: 4, y: 5, z: 6 });
  });

  it("equals", () => {
    const a = new Box3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
    const b = new Box3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
    expect(a.equals(b)).toBe(true);
  });

  it("set and setFromArray match THREE", () => {
    const e = new Box3().set(new Vector3(-2, 3, 1), new Vector3(4, 5, 8));
    const t = new TBox3().set(new TVector3(-2, 3, 1), new TVector3(4, 5, 8));
    expect(e.min).toMatchVector(t.min);
    expect(e.max).toMatchVector(t.max);

    const fromArray = new Box3().setFromArray([3, -1, 2, -4, 8, 0, 1, 2, 9]);
    const THREEFromArray = new TBox3().setFromArray([
      3, -1, 2, -4, 8, 0, 1, 2, 9,
    ]);
    expect(fromArray.min).toMatchVector(THREEFromArray.min);
    expect(fromArray.max).toMatchVector(THREEFromArray.max);
  });

  it("setFromCenterAndSize and output queries match THREE", () => {
    const center = new Vector3(2, -3, 4);
    const size = new Vector3(6, 10, 8);
    const e = new Box3().setFromCenterAndSize(center, size);
    const t = new TBox3().setFromCenterAndSize(
      new TVector3(center.x, center.y, center.z),
      new TVector3(size.x, size.y, size.z),
    );
    expect(e.min).toMatchVector(t.min);
    expect(e.max).toMatchVector(t.max);

    const point = new Vector3(5, -8, 8);
    const eCenter = e.getCenter(new Vector3());
    const eSize = e.getSize(new Vector3());
    const eParameter = e.getParameter(point, new Vector3());
    const eClamped = e.clampPoint(point, new Vector3());
    const tCenter = t.getCenter(new TVector3());
    const tSize = t.getSize(new TVector3());
    const tParameter = t.getParameter(
      new TVector3(point.x, point.y, point.z),
      new TVector3(),
    );
    const tClamped = t.clampPoint(
      new TVector3(point.x, point.y, point.z),
      new TVector3(),
    );
    expect(eCenter).toMatchVector(tCenter);
    expect(eSize).toMatchVector(tSize);
    expect(eParameter).toMatchVector(tParameter);
    expect(eClamped).toMatchVector(tClamped);
    expect(e.distanceToPoint(point)).toBeCloseTo(
      t.distanceToPoint(new TVector3(point.x, point.y, point.z)),
    );
  });

  it("applyMatrix4 transforms all eight corners", () => {
    const e = new Box3(new Vector3(-1, -2, -3), new Vector3(2, 3, 4));
    const t = new TBox3(new TVector3(-1, -2, -3), new TVector3(2, 3, 4));
    const matrix = new Matrix4()
      .makeRotationZ(Math.PI / 4)
      .multiply(new Matrix4().makeTranslation(3, -2, 1));
    const THREEMatrix = new TMatrix4()
      .makeRotationZ(Math.PI / 4)
      .multiply(new TMatrix4().makeTranslation(3, -2, 1));
    e.applyMatrix4(matrix);
    t.applyMatrix4(THREEMatrix);
    expect(e.min).toMatchVector(t.min, 1e-5);
    expect(e.max).toMatchVector(t.max, 1e-5);
  });

  it("expandByVector and intersect match THREE", () => {
    const e = new Box3(new Vector3(0, 1, 2), new Vector3(4, 5, 6));
    const t = new TBox3(new TVector3(0, 1, 2), new TVector3(4, 5, 6));
    e.expandByVector(new Vector3(1, 2, 3));
    t.expandByVector(new TVector3(1, 2, 3));
    expect(e.min).toMatchVector(t.min);
    expect(e.max).toMatchVector(t.max);

    const other = new Box3(new Vector3(0, 0, 0), new Vector3(3, 3, 3));
    const otherThree = new TBox3(new TVector3(0, 0, 0), new TVector3(3, 3, 3));
    e.intersect(other);
    t.intersect(otherThree);
    expect(e.min).toMatchVector(t.min);
    expect(e.max).toMatchVector(t.max);
  });

  it("plane, triangle, and bounding sphere queries match THREE", () => {
    const e = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
    const t = new TBox3(new TVector3(-1, -1, -1), new TVector3(1, 1, 1));
    const plane = new Plane(new Vector3(1, 0, 0), -0.5);
    const THREEPlane = new TPlane(new TVector3(1, 0, 0), -0.5);
    expect(e.intersectsPlane(plane)).toBe(t.intersectsPlane(THREEPlane));

    const triangle = new Triangle(
      new Vector3(0, 0, 0),
      new Vector3(2, 0, 0),
      new Vector3(0, 2, 0),
    );
    const THREETriangle = new TTriangle(
      new TVector3(0, 0, 0),
      new TVector3(2, 0, 0),
      new TVector3(0, 2, 0),
    );
    expect(e.intersectsTriangle(triangle)).toBe(
      t.intersectsTriangle(THREETriangle),
    );

    const sphere = new Sphere();
    const THREESphere = new TSphere();
    e.getBoundingSphere(sphere);
    t.getBoundingSphere(THREESphere);
    expect(sphere.centre).toMatchVector(THREESphere.center);
    expect(sphere.radius).toBeCloseTo(THREESphere.radius);
  });

  it("serializes and restores bounds", () => {
    const source = new Box3(new Vector3(-1, 2, -3), new Vector3(4, 5, 6));
    const restored = new Box3().fromJSON(source.toJSON());
    expect(restored.equals(source)).toBe(true);
    const empty = new Box3().getBoundingSphere(new Sphere());
    expect(empty.radius).toBe(-1);
  });

  it("round-trips an empty box through JSON", () => {
    const json = JSON.parse(JSON.stringify(new Box3().toJSON())) as {
      min: number[];
      max: number[];
    };
    expect(json).toEqual({ min: [], max: [] });
    expect(new Box3().fromJSON(json).isEmpty).toBe(true);
  });
});
