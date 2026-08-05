import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import {
  Euler as TEuler,
  Matrix4 as TMatrix4,
  Quaternion as TQuaternion,
} from "three";
import { Matrix4 } from "@/math/Matrix4.js";
import {
  multiplyQuaternionsFlat,
  Quaternion,
  slerpQuaternionsFlat,
} from "@/math/Quaternion.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Quaternion", () => {
  it("constructor defaults", () => {
    const e = new Quaternion();
    const t = new TQuaternion();
    expect(e.x).toBe(t.x);
    expect(e.y).toBe(t.y);
    expect(e.z).toBe(t.z);
    expect(e.w).toBe(t.w);
  });

  it("set", () => {
    const e = new Quaternion().set(1, 2, 3, 4);
    expect(e).toMatchVector({ x: 1, y: 2, z: 3, w: 4 });
  });

  it("setFromAxisAngle", () => {
    const axis = { x: 0, y: 1, z: 0 };
    const angle = Math.PI / 4;
    const e = new Quaternion().setFromAxisAngle(axis, angle);
    const t = new TQuaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 }, angle);
    expect(e).toMatchVector(t);
  });

  it("setFromEuler", () => {
		// EASEL setFromEuler accepts plain {x,y,z,order} objects
    const euler = { x: 0.1, y: 0.2, z: 0.3, order: "XYZ" };
    const e = new Quaternion().setFromEuler(euler);
    // verify result is a unit quaternion
    expect(e.length).toBeCloseTo(1, 5);
    // spot-check against known values for XYZ(0.1, 0.2, 0.3)
    expect(e.w).toBeGreaterThan(0.9);
  });

  it("setFromEuler fast-path matches THREE for axis-only rotations", () => {
    const angles = [0, 0.25, -0.8, Math.PI, 10];
    for (const a of angles) {
      const ey = new Quaternion().setFromEuler({
        x: 0,
        y: a,
        z: 0,
        order: "XYZ",
      });
      const ty = new TQuaternion().setFromEuler(new TEuler(0, a, 0, "XYZ"));
      expect(ey).toMatchVector(ty, 1e-8);

      const ex = new Quaternion().setFromEuler({
        x: a,
        y: 0,
        z: 0,
        order: "XYZ",
      });
      const tx = new TQuaternion().setFromEuler(new TEuler(a, 0, 0, "XYZ"));
      expect(ex).toMatchVector(tx, 1e-8);

      const ez = new Quaternion().setFromEuler({
        x: 0,
        y: 0,
        z: a,
        order: "XYZ",
      });
      const tz = new TQuaternion().setFromEuler(new TEuler(0, 0, a, "XYZ"));
      expect(ez).toMatchVector(tz, 1e-8);
    }
  });

  it("setFromRotationMatrix", () => {
    const em = new Matrix4().makeRotationY(Math.PI / 3);
    const e = new Quaternion().setFromRotationMatrix(em);
    const tm = new TMatrix4().makeRotationY(Math.PI / 3);
    const t = new TQuaternion().setFromRotationMatrix(tm);
    expect(e).toMatchVector(t, 1e-5);
  });

  it("normalize", () => {
    const e = new Quaternion().set(2, 0, 0, 0).normalize();
    expect(e.length).toBeCloseTo(1);
  });

  it("dot, angle, identity and conjugate", () => {
    const a = new Quaternion().setFromAxisAngle(
      { x: 0, y: 1, z: 0 },
      Math.PI / 3,
    );
    const b = new Quaternion().setFromAxisAngle(
      { x: 0, y: 1, z: 0 },
      -Math.PI / 3,
    );
    expect(a.dot(a)).toBeCloseTo(1);
    expect(a.angleTo(b)).toBeCloseTo((2 * Math.PI) / 3);
    expect(a.clone().conjugate()).toMatchVector({
      x: -a.x,
      y: -a.y,
      z: -a.z,
      w: a.w,
    });
    expect(a.clone().identity()).toMatchVector({ x: 0, y: 0, z: 0, w: 1 });
  });

  it("invert (conjugate for unit)", () => {
    const e = new Quaternion().setFromAxisAngle(
      { x: 0, y: 1, z: 0 },
      Math.PI / 4,
    );
    const x0 = e.x;
    e.invert();
    expect(e.x).toBeCloseTo(-x0);
    expect(e.w).toBeCloseTo(Math.cos(Math.PI / 8));
  });

  it("length", () => {
    const e = new Quaternion().set(0, 0, 0, 1);
    expect(e.length).toBeCloseTo(1);
  });

  it("clone", () => {
    const orig = new Quaternion().set(1, 2, 3, 4);
    const c = orig.clone();
    expect(c).toMatchVector({ x: 1, y: 2, z: 3, w: 4 });
    c.set(9, 9, 9, 9);
    expect(orig.x).toBe(1);
  });

  it("equals", () => {
    const a = new Quaternion().set(1, 2, 3, 4);
    const b = new Quaternion().set(1, 2, 3, 4);
    expect(a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w).toBe(true);
  });

  it("premultiply matches THREE", () => {
    const ea = new Quaternion().setFromAxisAngle(
      { x: 1, y: 0, z: 0 },
      Math.PI / 4,
    );
    const eb = new Quaternion().setFromAxisAngle(
      { x: 0, y: 1, z: 0 },
      Math.PI / 3,
    );
    ea.premultiply(eb);

    const ta = new TQuaternion().setFromAxisAngle(
      { x: 1, y: 0, z: 0 },
      Math.PI / 4,
    );
    const tb = new TQuaternion().setFromAxisAngle(
      { x: 0, y: 1, z: 0 },
      Math.PI / 3,
    );
    ta.premultiply(tb);

    expect(ea).toMatchVector(ta, 1e-5);
  });

  it("multiply and multiplyQuaternions match THREE", () => {
    const ea = new Quaternion().setFromAxisAngle(
      { x: 1, y: 0, z: 0 },
      Math.PI / 4,
    );
    const eb = new Quaternion().setFromAxisAngle(
      { x: 0, y: 1, z: 0 },
      Math.PI / 3,
    );
    const e = ea.clone().multiply(eb);
    const t = new TQuaternion()
      .setFromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 4)
      .multiply(
        new TQuaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 3),
      );
    expect(e).toMatchVector(t, 1e-5);
    expect(new Quaternion().multiplyQuaternions(ea, eb)).toMatchVector(t, 1e-5);
  });

  it("matches THREE flat quaternion operations without object allocation", () => {
    const left = [99, 0, 0, 0, 1, 99];
    const right = [99, 0, Math.SQRT1_2, 0, Math.SQRT1_2, 99];
    const EASELProduct = new Float64Array(6);
    const THREEProduct = Array<number>(6).fill(0);
    expect(multiplyQuaternionsFlat(EASELProduct, 1, left, 1, right, 1)).toBe(
      EASELProduct,
    );
    TQuaternion.multiplyQuaternionsFlat(THREEProduct, 1, left, 1, right, 1);
    expect([...EASELProduct]).toEqual(THREEProduct);

    const EASELSlerp = new Float64Array(6);
    const THREESlerp = Array<number>(6).fill(0);
    expect(slerpQuaternionsFlat(EASELSlerp, 1, left, 1, right, 1, 0.25)).toBe(
      EASELSlerp,
    );
    TQuaternion.slerpFlat(THREESlerp, 1, left, 1, right, 1, 0.25);
    expect([...EASELSlerp]).toEqual(THREESlerp);
  });

  it("setFromUnitVectors handles aligned and opposite directions", () => {
    const from = new Vector3(1, 0, 0);
    const to = new Vector3(0, 1, 0);
    const e = new Quaternion().setFromUnitVectors(from, to);
    expect(new Vector3(1, 0, 0).applyQuaternion(e)).toMatchVector(to, 1e-5);

    const opposite = new Quaternion().setFromUnitVectors(
      from,
      new Vector3(-1, 0, 0),
    );
    expect(new Vector3(1, 0, 0).applyQuaternion(opposite)).toMatchVector(
      { x: -1, y: 0, z: 0 },
      1e-5,
    );
  });

  it("slerp, rotateTowards and serialization", () => {
    const start = new Quaternion().identity();
    const end = new Quaternion().setFromAxisAngle(
      { x: 0, y: 1, z: 0 },
      Math.PI,
    );
    expect(start.clone().slerp(end, 0)).toMatchVector(start, 1e-5);
    expect(start.clone().slerp(end, 1)).toMatchVector(end, 1e-5);
    const stepped = start.clone().rotateTowards(end, Math.PI / 2);
    expect(stepped.angleTo(end)).toBeCloseTo(Math.PI / 2, 5);
    expect(stepped.length).toBeCloseTo(1, 5);
    expect(
      new Quaternion().slerpQuaternions(start, end, 0.5).length,
    ).toBeCloseTo(1, 5);

    const value = new Quaternion(1, 2, 3, 4);
    const array = [0, 0, 0, 0, 0, 0];
    expect(value.toArray(array, 1)).toEqual([0, 1, 2, 3, 4, 0]);
    expect(new Quaternion().fromArray(array, 1)).toMatchVector(value);
    expect(value.toJSON()).toEqual([1, 2, 3, 4]);
  });

  it("random returns a normalized quaternion", () => {
    expect(new Quaternion().random().length).toBeCloseTo(1, 12);
  });
});
