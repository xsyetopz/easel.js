import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.js";
import { Frustum as TFrustum, Matrix4 as TMatrix4 } from "three";
import { Box3 } from "@/math/Box3.js";
import { Frustum } from "@/math/Frustum.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { Sphere } from "@/math/Sphere.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Frustum", () => {
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
