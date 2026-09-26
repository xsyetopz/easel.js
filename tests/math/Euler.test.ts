import { describe, expect, it, vi } from "bun:test";
import "../_helpers/assertions.ts";
import {
  Euler as TEuler,
  Matrix4 as TMatrix4,
  Quaternion as TQuaternion,
} from "three";
import { Euler } from "@/math/Euler.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { Quaternion } from "@/math/Quaternion.js";

describe("Euler", () => {
  it("constructor defaults", () => {
    const e = new Euler();
    const t = new TEuler();
    expect(e.x).toBe(t.x);
    expect(e.y).toBe(t.y);
    expect(e.z).toBe(t.z);
    expect(e.order).toBe(t.order);
  });

  it("constructor with args", () => {
    const e = new Euler(0.1, 0.2, 0.3, "YXZ");
    expect(e.x).toBeCloseTo(0.1);
    expect(e.y).toBeCloseTo(0.2);
    expect(e.z).toBeCloseTo(0.3);
    expect(e.order).toBe("YXZ");
  });

  it("set", () => {
    const e = new Euler().set(1, 2, 3, "ZYX");
    expect(e.x).toBe(1);
    expect(e.y).toBe(2);
    expect(e.z).toBe(3);
    expect(e.order).toBe("ZYX");
  });

  it("clone", () => {
    const orig = new Euler(0.1, 0.2, 0.3, "YXZ");
    const c = orig.clone();
    expect(c.x).toBeCloseTo(0.1);
    expect(c.order).toBe("YXZ");
    c.set(9, 9, 9);
    expect(orig.x).toBeCloseTo(0.1);
  });

  it("equals", () => {
    const a = new Euler(0.1, 0.2, 0.3, "XYZ");
    const b = new Euler(0.1, 0.2, 0.3, "XYZ");
    expect(
      a.x === b.x && a.y === b.y && a.z === b.z && a.order === b.order,
    ).toBe(true);
  });

  it("setFromQuaternion round-trip", () => {
    const q = new Quaternion().setFromAxisAngle(
      { x: 0, y: 1, z: 0 },
      Math.PI / 4,
    );
    const e = new Euler().setFromQuaternion(q, "XYZ");

    const tq = new TQuaternion().setFromAxisAngle(
      { x: 0, y: 1, z: 0 },
      Math.PI / 4,
    );
    const t = new TEuler().setFromQuaternion(tq, "XYZ");

    expect(e.x).toBeCloseTo(t.x, 4);
    expect(e.y).toBeCloseTo(t.y, 4);
    expect(e.z).toBeCloseTo(t.z, 4);
  });

  it("setFromRotationMatrix", () => {
    const m = new Matrix4().makeRotationY(Math.PI / 4);
    const e = new Euler().setFromRotationMatrix(m, "XYZ");

    const tm = new TMatrix4().makeRotationY(Math.PI / 4);
    const t = new TEuler().setFromRotationMatrix(tm, "XYZ");

    expect(e.x).toBeCloseTo(t.x, 4);
    expect(e.y).toBeCloseTo(t.y, 4);
    expect(e.z).toBeCloseTo(t.z, 4);
  });

  it("setOnChangeCallback fires on set", () => {
    const e = new Euler();
    const cb = vi.fn();
    e.setOnChangeCallback(cb);
    e.set(1, 2, 3);
    expect(cb).toHaveBeenCalled();
  });

  it("setOnChangeCallback fires on x assignment", () => {
    const e = new Euler();
    const cb = vi.fn();
    e.setOnChangeCallback(cb);
    e.x = 0.5;
    expect(cb).toHaveBeenCalled();
  });
});

describe("Euler gimbal lock", () => {
  it("matches three.js in every order and ignores the previous angles", () => {
    const orders = ["XYZ", "YXZ", "ZXY", "ZYX", "YZX", "XZY"] as const;
    for (const order of orders) {
      // A middle rotation of ±90 degrees puts each order into gimbal lock.
      const reference = new TEuler(0.3, 0.4, 0.5, order);
      if (order[1] === "X") reference.x = Math.PI / 2;
      if (order[1] === "Y") reference.y = Math.PI / 2;
      if (order[1] === "Z") reference.z = Math.PI / 2;
      // three's JS-inferred types omit this method; it exists at runtime.
      const matrix = (
        new TMatrix4() as unknown as {
          makeRotationFromEuler(euler: TEuler): TMatrix4;
        }
      ).makeRotationFromEuler(reference);
      const expected = new TEuler().setFromRotationMatrix(matrix, order);

      const fresh = new Euler().setFromRotationMatrix(matrix, order);
      const reused = new Euler(1, 2, 3, order).setFromRotationMatrix(
        matrix,
        order,
      );
      for (const euler of [fresh, reused]) {
        expect(euler.x).toBeCloseTo(expected.x, 9);
        expect(euler.y).toBeCloseTo(expected.y, 9);
        expect(euler.z).toBeCloseTo(expected.z, 9);
      }
    }
  });
});
