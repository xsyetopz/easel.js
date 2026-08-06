import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import {
  Box3 as TBox3,
  Line3 as TLine3,
  Plane as TPlane,
  Sphere as TSphere,
  Vector3 as TVector3,
} from "three";
import { Box3 } from "@/math/Box3.js";
import { Line3 } from "@/math/Line3.js";
import { Plane } from "@/math/Plane.js";
import { Sphere } from "@/math/Sphere.js";
import { Vector3 } from "@/math/Vector3.js";

type THREEPlaneParity = TPlane & {
  distanceToSphere(sphere: TSphere): number;
  intersectsBox(box: TBox3): boolean;
  intersectsLine(line: TLine3): boolean;
};

type THREESphereParity = TSphere & {
  intersectsPlane(plane: TPlane): boolean;
};

describe("Plane", () => {
  it("constructor defaults", () => {
    const e = new Plane();
    const t = new TPlane();
    expect(e.normal).toMatchVector(t.normal);
    expect(e.constant).toBe(t.constant);
    expect(e.isPlane).toBe(true);
  });

  it("set and negate", () => {
    const e = new Plane().set(new Vector3(0, 1, 0), -3);
    expect(e).toBeInstanceOf(Plane);
    expect(e.normal).toMatchVector({ x: 0, y: 1, z: 0 });
    expect(e.constant).toBe(-3);
    expect(e.negate()).toBe(e);
    expect(e.normal).toMatchVector({ x: 0, y: -1, z: 0 });
    expect(e.constant).toBe(3);
  });

  it("set via constructor", () => {
    const e = new Plane(new Vector3(0, 1, 0), -3);
    expect(e.normal).toMatchVector({ x: 0, y: 1, z: 0 });
    expect(e.constant).toBeCloseTo(-3);
  });

  it("setFromNormalAndCoplanarPoint", () => {
    const normal = new Vector3(0, 1, 0);
    const point = new Vector3(0, 5, 0);
    const e = new Plane().setFromNormalAndCoplanarPoint(normal, point);
    const t = new TPlane().setFromNormalAndCoplanarPoint(
      new TVector3(0, 1, 0),
      new TVector3(0, 5, 0),
    );
    expect(e.normal).toMatchVector(t.normal);
    expect(e.constant).toBeCloseTo(t.constant);
  });

  it("distanceToPoint", () => {
    const e = new Plane(new Vector3(0, 1, 0), -2);
    const t = new TPlane(new TVector3(0, 1, 0), -2) as THREEPlaneParity;
    const ep = new Vector3(0, 5, 0);
    const tp = new TVector3(0, 5, 0);
    expect(e.distanceToPoint(ep)).toBeCloseTo(t.distanceToPoint(tp));
  });

  it("distanceToSphere and intersectsSphere", () => {
    const e = new Plane(new Vector3(0, 1, 0), -2);
    const t = new TPlane(new TVector3(0, 1, 0), -2) as THREEPlaneParity;
    const es = new Sphere(new Vector3(0, 5, 0), 1);
    const ts = new TSphere(new TVector3(0, 5, 0), 1);
    expect(e.distanceToSphere(es)).toBeCloseTo(t.distanceToSphere(ts));
    expect(e.intersectsSphere(es)).toBe(
      (ts as THREESphereParity).intersectsPlane(t),
    );
  });

  it("projectPoint", () => {
    const e = new Plane(new Vector3(0, 1, 0), 0);
    const t = new TPlane(new TVector3(0, 1, 0), 0) as THREEPlaneParity;
    const ep = e.projectPoint(new Vector3(3, 5, 2), new Vector3());
    const tp = t.projectPoint(new TVector3(3, 5, 2), new TVector3());
    expect(ep).toMatchVector(tp);
  });

  it("intersectLine", () => {
    const e = new Plane(new Vector3(0, 1, 0), 0);
    const lineStart = new Vector3(0, -1, 0);
    const lineEnd = new Vector3(0, 1, 0);
    const ep = e.intersectLine(
      { start: lineStart, end: lineEnd },
      new Vector3(),
    );
    // line goes from y=-1 to y=1, plane is y=0, should intersect at origin
    expect(ep).not.toBeUndefined();
    expect(ep).toMatchVector({ x: 0, y: 0, z: 0 });
  });

  it("intersectsLine follows THREE.js strict crossing semantics", () => {
    const e = new Plane(new Vector3(0, 1, 0), 0);
    const t = new TPlane(new TVector3(0, 1, 0), 0) as THREEPlaneParity;
    const crossing = new Line3(new Vector3(0, -1, 0), new Vector3(0, 1, 0));
    const tcrossing = new TLine3(new TVector3(0, -1, 0), new TVector3(0, 1, 0));
    const endpoint = new Line3(new Vector3(0, 0, 0), new Vector3(0, 1, 0));
    const tendpoint = new TLine3(new TVector3(0, 0, 0), new TVector3(0, 1, 0));
    const coplanar = new Line3(new Vector3(0, 0, 0), new Vector3(1, 0, 0));
    const tcoplanar = new TLine3(new TVector3(0, 0, 0), new TVector3(1, 0, 0));
    expect(e.intersectsLine(crossing)).toBe(t.intersectsLine(tcrossing));
    expect(e.intersectsLine(endpoint)).toBe(t.intersectsLine(tendpoint));
    expect(e.intersectsLine(coplanar)).toBe(t.intersectsLine(tcoplanar));
  });

  it("intersectsBox", () => {
    const diagonal = 1 / Math.sqrt(2);
    const e = new Plane(new Vector3(diagonal, diagonal, 0), -1);
    const t = new TPlane(
      new TVector3(diagonal, diagonal, 0),
      -1,
    ) as THREEPlaneParity;
    const boxes = [
      new Box3(new Vector3(-2, -2, -1), new Vector3(0, 0, 1)),
      new Box3(new Vector3(2, 2, -1), new Vector3(3, 3, 1)),
    ];
    const tboxes = [
      new TBox3(new TVector3(-2, -2, -1), new TVector3(0, 0, 1)),
      new TBox3(new TVector3(2, 2, -1), new TVector3(3, 3, 1)),
    ];
    for (let i = 0; i < boxes.length; i++) {
      expect(e.intersectsBox(boxes[i])).toBe(t.intersectsBox(tboxes[i]));
    }
  });

  it("clone", () => {
    const orig = new Plane(new Vector3(1, 0, 0), -5);
    const c = orig.clone();
    expect(c.normal).toMatchVector({ x: 1, y: 0, z: 0 });
    expect(c.constant).toBe(-5);
  });

  it("equals", () => {
    const a = new Plane(new Vector3(0, 1, 0), -2);
    const b = new Plane(new Vector3(0, 1, 0), -2);
    expect(a.equals(b)).toBe(true);
  });
});
