import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.js";
import { Line3 as TLine3, Vector3 as TVector3 } from "three";
import { Line3 } from "@/math/Line3.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Line3", () => {
  it("constructor defaults", () => {
    const e = new Line3();
    const t = new TLine3();
    expect(e.start).toMatchVector(t.start);
    expect(e.end).toMatchVector(t.end);
  });

  it("set", () => {
    const e = new Line3().set(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
    expect(e.start).toMatchVector({ x: 0, y: 0, z: 0 });
    expect(e.end).toMatchVector({ x: 1, y: 1, z: 1 });
  });

  it("midpoint via at(0.5) (vs THREE getCenter)", () => {
    const e = new Line3(new Vector3(0, 0, 0), new Vector3(4, 0, 0));
    const t = new TLine3(new TVector3(0, 0, 0), new TVector3(4, 0, 0));
    const tc = t.getCenter(new TVector3());
    const ep = e.at(0.5, new Vector3());
    expect(ep).toMatchVector(tc);
  });

  it("delta getter", () => {
    const e = new Line3(new Vector3(1, 2, 3), new Vector3(4, 6, 9));
    const t = new TLine3(new TVector3(1, 2, 3), new TVector3(4, 6, 9));
		// delta is a getter in EASEL (returns Vector3), method in THREE
    const ed = e.delta;
    const td = t.delta(new TVector3());
    expect(ed).toMatchVector(td);
  });

  it("length getter (vs THREE distance())", () => {
    const e = new Line3(new Vector3(0, 0, 0), new Vector3(3, 4, 0));
    const t = new TLine3(new TVector3(0, 0, 0), new TVector3(3, 4, 0));
		// EASEL: .length getter, THREE: .distance() method
    expect(e.length).toBeCloseTo(t.distance());
  });

  it("at", () => {
    const e = new Line3(new Vector3(0, 0, 0), new Vector3(10, 0, 0));
    const t = new TLine3(new TVector3(0, 0, 0), new TVector3(10, 0, 0));
    const ep = e.at(0.5, new Vector3());
    const tp = t.at(0.5, new TVector3());
    expect(ep).toMatchVector(tp);
  });

  it("closestPointToPoint", () => {
    const e = new Line3(new Vector3(0, 0, 0), new Vector3(10, 0, 0));
    const t = new TLine3(new TVector3(0, 0, 0), new TVector3(10, 0, 0));
    const ep = e.closestPointToPoint(new Vector3(5, 3, 0), true, new Vector3());
    const tp = t.closestPointToPoint(
      new TVector3(5, 3, 0),
      true,
      new TVector3(),
    );
    expect(ep).toMatchVector(tp);
  });

  it("clone", () => {
    const orig = new Line3(new Vector3(1, 2, 3), new Vector3(4, 5, 6));
    const c = orig.clone();
    expect(c.start).toMatchVector({ x: 1, y: 2, z: 3 });
    c.start.set(9, 9, 9);
    expect(orig.start.x).toBe(1);
  });

  it("equals", () => {
    const a = new Line3(new Vector3(1, 2, 3), new Vector3(4, 5, 6));
    const b = new Line3(new Vector3(1, 2, 3), new Vector3(4, 5, 6));
    expect(a.equals(b)).toBe(true);
  });
});
