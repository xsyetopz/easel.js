import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.js";
import { Frustum as TFrustum, Matrix4 as TMatrix4 } from "three";
import { Box3 } from "@/math/Box3.js";
import { Frustum } from "@/math/Frustum.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { Plane } from "@/math/Plane.js";
import { Sphere } from "@/math/Sphere.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Frustum", () => {
  it("set copies six planes without replacing the plane records", () => {
    const frustum = new Frustum();
    const planeRecords = frustum.planes.slice();
    const planes = Array.from(
      { length: 6 },
      (_, index) => new Plane(new Vector3(index + 1, 0, 0), index + 0.5),
    );

    expect(frustum.set(...planes)).toBe(frustum);
    expect(frustum.planes).toHaveLength(6);
    for (let index = 0; index < 6; index++) {
      expect(frustum.planes[index]).toBe(planeRecords[index]);
      expect(frustum.planes[index]).not.toBe(planes[index]);
      expect(frustum.planes[index].equals(planes[index])).toBe(true);
    }
  });

  it("set defaults omitted planes to the default plane", () => {
    const frustum = new Frustum().set(
      new Plane(new Vector3(0, 1, 0), 2),
      new Plane(new Vector3(0, 0, 1), 3),
    );

    expect(frustum.planes[0].normal.equals(new Vector3(0, 1, 0))).toBe(true);
    expect(frustum.planes[0].constant).toBe(2);
    expect(frustum.planes[1].normal.equals(new Vector3(0, 0, 1))).toBe(true);
    expect(frustum.planes[1].constant).toBe(3);
    for (const plane of frustum.planes.slice(2)) {
      expect(plane.normal.equals(new Vector3(1, 0, 0))).toBe(true);
      expect(plane.constant).toBe(0);
    }
  });

  it("setFromProjectionMatrix + containsPoint origin", () => {
    const tm = new TMatrix4().makePerspective(-1, 1, 1, -1, 0.1, 100);
    const em = new Matrix4();
    em.elements.set(tm.elements);

    const tf = new TFrustum().setFromProjectionMatrix(tm);
    const ef = new Frustum().setFromProjectionMatrix(em);

    // A point at (0,0,-1) is inside the frustum for a perspective projection with near=0.1
    const inside = { x: 0, y: 0, z: -1 };
    expect(ef.containsPoint(inside)).toBe(
      tf.containsPoint(new TMatrix4().constructor ? inside : inside),
    );
  });

  it("containsPoint far outside returns false", () => {
    const tm = new TMatrix4().makePerspective(-1, 1, 1, -1, 0.1, 100);
    const em = new Matrix4();
    em.elements.set(tm.elements);
    const ef = new Frustum().setFromProjectionMatrix(em);

    expect(ef.containsPoint({ x: 0, y: 0, z: -200 })).toBe(false);
    expect(ef.containsPoint({ x: 1000, y: 0, z: -1 })).toBe(false);
  });

  it("intersectsBox with box inside", () => {
    const tm = new TMatrix4().makeOrthographic(-10, 10, 10, -10, 0.1, 100);
    const em = new Matrix4();
    em.elements.set(tm.elements);
    const ef = new Frustum().setFromProjectionMatrix(em);

    const box = new Box3(new Vector3(-1, -1, -5), new Vector3(1, 1, -2));
    expect(ef.intersectsBox(box)).toBe(true);
  });

  it("intersectsBox with box outside", () => {
    const tm = new TMatrix4().makeOrthographic(-10, 10, 10, -10, 0.1, 100);
    const em = new Matrix4();
    em.elements.set(tm.elements);
    const ef = new Frustum().setFromProjectionMatrix(em);

    const farBox = new Box3(new Vector3(-1, -1, -200), new Vector3(1, 1, -150));
    expect(ef.intersectsBox(farBox)).toBe(false);
  });

  it("intersectsSphere with sphere inside", () => {
    const tm = new TMatrix4().makeOrthographic(-10, 10, 10, -10, 0.1, 100);
    const em = new Matrix4();
    em.elements.set(tm.elements);
    const ef = new Frustum().setFromProjectionMatrix(em);

    const sphere = new Sphere(new Vector3(0, 0, -5), 1);
    expect(ef.intersectsSphere(sphere)).toBe(true);
  });
});
