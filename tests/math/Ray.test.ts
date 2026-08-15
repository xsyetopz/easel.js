import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import { Box3 as TBox3, Ray as TRay, Vector3 as TVector3 } from "three";
import { Box3 } from "@/math/Box3.js";
import { Plane } from "@/math/Plane.js";
import { Ray } from "@/math/Ray.js";
import { Sphere } from "@/math/Sphere.js";
import { Vector3 } from "@/math/Vector3.js";
import { defined } from "../_helpers/defined.ts";

describe("Ray", () => {
  it("constructor defaults", () => {
    const e = new Ray();
    const t = new TRay();
    expect(e.origin).toMatchVector(t.origin);
    expect(e.direction).toMatchVector(t.direction);
  });

  it("set", () => {
    const e = new Ray().set(new Vector3(1, 2, 3), new Vector3(0, 1, 0));
    expect(e.origin).toMatchVector({ x: 1, y: 2, z: 3 });
    expect(e.direction).toMatchVector({ x: 0, y: 1, z: 0 });
  });

  it("at", () => {
    const e = new Ray(new Vector3(0, 0, 0), new Vector3(1, 0, 0));
    const t = new TRay(new TVector3(0, 0, 0), new TVector3(1, 0, 0));
    const ep = e.at(3, new Vector3());
    const tp = t.at(3, new TVector3());
    expect(ep).toMatchVector(tp);
  });

  it("distanceToPoint", () => {
    const e = new Ray(new Vector3(0, 0, 0), new Vector3(1, 0, 0));
    const t = new TRay(new TVector3(0, 0, 0), new TVector3(1, 0, 0));
    const d = e.distanceToPoint(new Vector3(0, 3, 0));
    const td = t.distanceToPoint(new TVector3(0, 3, 0));
    expect(d).toBeCloseTo(td);
  });

  it("intersectSphere hit", () => {
    const ray = new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
    const sphere = new Sphere(new Vector3(0, 0, 0), 1);
    const hit = ray.intersectSphere(sphere, new Vector3());
    expect(hit).not.toBeUndefined();
    expect(defined(hit).z).toBeCloseTo(1);
  });

  it("intersectSphere miss", () => {
    const ray = new Ray(new Vector3(0, 5, 0), new Vector3(0, 0, -1));
    const sphere = new Sphere(new Vector3(0, 0, 0), 1);
    expect(ray.intersectSphere(sphere, new Vector3())).toBeUndefined();
  });

  it("intersectPlane", () => {
    const ray = new Ray(new Vector3(0, 5, 0), new Vector3(0, -1, 0));
    const plane = new Plane(new Vector3(0, 1, 0), 0);
    const hit = ray.intersectPlane(plane, new Vector3());
    expect(hit).not.toBeUndefined();
    expect(defined(hit).y).toBeCloseTo(0);
  });

  it("intersectBox hit", () => {
    const ray = new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
    const box = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
    const target = new Vector3();
    const hit = ray.intersectBox(box, target);
    expect(hit).not.toBeUndefined();
    expect(hit).toBe(target);
    expect(ray.intersectsBox(box)).toBe(true);
  });

  it("intersectBox matches THREE for parallel slabs and inside origins", () => {
    const cases = [
      {
        origin: [0, 0, 0] as const,
        direction: [1, 0, 0] as const,
        min: [-1, -2, -3] as const,
        max: [1, 2, 3] as const,
      },
      {
        origin: [2, 0, 0] as const,
        direction: [0, 1, 0] as const,
        min: [-1, -2, -3] as const,
        max: [1, 2, 3] as const,
      },
      {
        origin: [1, -4, 0] as const,
        direction: [0, 1, 0] as const,
        min: [-1, -2, -3] as const,
        max: [1, 2, 3] as const,
      },
    ];

    for (const values of cases) {
      const origin = new Vector3(...values.origin);
      const direction = new Vector3(...values.direction);
      const box = new Box3(
        new Vector3(...values.min),
        new Vector3(...values.max),
      );
      const ray = new Ray(origin, direction);
      const THREERay = new TRay(
        new TVector3(...values.origin),
        new TVector3(...values.direction),
      );
      const target = new Vector3(9, 8, 7);
      const THREETarget = new TVector3(9, 8, 7);
      const hit = ray.intersectBox(box, target);
      const THREEHit = THREERay.intersectBox(
        new TBox3(new TVector3(...values.min), new TVector3(...values.max)),
        THREETarget,
      );

      expect(ray.intersectsBox(box)).toBe(
        THREEHit !== null && THREEHit !== undefined,
      );
      if (THREEHit === null || THREEHit === undefined) {
        expect(hit).toBeUndefined();
        expect(target).toMatchVector({ x: 9, y: 8, z: 7 });
      } else {
        if (hit === undefined) {
          throw new Error("Expected ray-box intersection");
        }
        expect(hit).toBe(target);
        expect(hit).toMatchVector(THREEHit);
      }
    }
  });

  it("clone", () => {
    const orig = new Ray(new Vector3(1, 2, 3), new Vector3(0, 1, 0));
    const c = orig.clone();
    expect(c.origin).toMatchVector({ x: 1, y: 2, z: 3 });
  });

  it("equals", () => {
    const a = new Ray(new Vector3(1, 2, 3), new Vector3(0, 1, 0));
    const b = new Ray(new Vector3(1, 2, 3), new Vector3(0, 1, 0));
    expect(a.equals(b)).toBe(true);
  });
});
