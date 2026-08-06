import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.js";
import { Box3 } from "@/math/Box3.js";
import { Matrix3 } from "@/math/Matrix3.js";
import { OBB } from "@/math/OBB.js";
import { Plane } from "@/math/Plane.js";
import { Ray } from "@/math/Ray.js";
import { Sphere } from "@/math/Sphere.js";
import { Vector3 } from "@/math/Vector3.js";

describe("OBB", () => {
  it("initializes from an axis-aligned box", () => {
    const box = new Box3(new Vector3(-2, -4, -6), new Vector3(2, 4, 6));
    const obb = new OBB().fromBox3(box);
    expect(obb.center).toMatchVector({ x: 0, y: 0, z: 0 });
    expect(obb.halfSize).toMatchVector({ x: 2, y: 4, z: 6 });
    expect(obb.rotation.equals(new Matrix3())).toBe(true);
  });

  it("contains and clamps points in local coordinates", () => {
    const rotation = new Matrix3().makeRotation(Math.PI / 2);
    const obb = new OBB(new Vector3(1, 2, 0), new Vector3(2, 1, 1), rotation);
    expect(obb.containsPoint(new Vector3(1, 3, 0))).toBe(true);
    expect(obb.containsPoint(new Vector3(4, 2, 0))).toBe(false);
    expect(obb.clampPoint(new Vector3(4, 2, 0))).toMatchVector({
      x: 2,
      y: 2,
      z: 0,
    });
  });

  it("uses separating axes for rotated OBBs", () => {
    const a = new OBB(new Vector3(), new Vector3(1, 1, 1));
    const b = new OBB(
      new Vector3(1.9, 0, 0),
      new Vector3(1, 1, 1),
      new Matrix3().makeRotation(Math.PI / 4),
    );
    expect(a.intersectsOBB(b)).toBe(true);
    b.center.set(3.1, 0, 0);
    expect(a.intersectsOBB(b)).toBe(false);
  });

  it("intersects spheres, planes, and rays", () => {
    const obb = new OBB(new Vector3(2, 0, 0), new Vector3(1, 1, 1));
    expect(obb.intersectsSphere(new Sphere(new Vector3(3.5, 0, 0), 0.5))).toBe(
      true,
    );
    expect(obb.intersectsSphere(new Sphere(new Vector3(4, 0, 0), 0.5))).toBe(
      false,
    );
    expect(obb.intersectsPlane(new Plane(new Vector3(1, 0, 0), -3))).toBe(true);
    expect(obb.intersectsPlane(new Plane(new Vector3(1, 0, 0), -4.1))).toBe(
      false,
    );
    const hit = obb.intersectRay(
      new Ray(new Vector3(0, 0, 0), new Vector3(1, 0, 0)),
    );
    expect(hit).toMatchVector({ x: 1, y: 0, z: 0 });
    expect(
      obb.intersectsRay(new Ray(new Vector3(0, 3, 0), new Vector3(1, 0, 0))),
    ).toBe(false);
  });
});
