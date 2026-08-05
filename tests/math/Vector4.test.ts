import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import { Matrix4 } from "@/math/Matrix4.js";
import { dot4, Vector4 } from "@/math/Vector4.js";

describe("Vector4", () => {
  it("provides a top-level component dot product", () => {
    expect(dot4(1, 2, 3, 4, new Vector4(2, 3, 4, 5))).toBe(40);
  });

  it("constructor defaults", () => {
    const e = new Vector4();
    // EASEL default w=1, THREE default w=1
    expect(e.x).toBe(0);
    expect(e.y).toBe(0);
    expect(e.z).toBe(0);
    expect(e.w).toBe(1);
  });

  it("constructor with args", () => {
    const e = new Vector4(1, 2, 3, 4);
    expect(e.x).toBe(1);
    expect(e.y).toBe(2);
    expect(e.z).toBe(3);
    expect(e.w).toBe(4);
  });

  it("set", () => {
    const e = new Vector4().set(1, 2, 3, 4);
    expect(e).toMatchVector({ x: 1, y: 2, z: 3, w: 4 });
  });

  it("add - manual check", () => {
    const e = new Vector4(1, 2, 3, 4);
    e.addScalar(1);
    expect(e).toMatchVector({ x: 2, y: 3, z: 4, w: 5 });
  });

  it("component arithmetic", () => {
    const e = new Vector4(1, 2, 3, 4)
      .add(new Vector4(1, 2, 3, 4))
      .addScaledVector(new Vector4(1, 1, 1, 1), 2)
      .multiply(new Vector4(1, 2, 3, 4))
      .divide(new Vector4(2, 4, 6, 8))
      .subScalar(1);
    expect(e).toMatchVector({ x: 1, y: 2, z: 3, w: 4 });
    expect(
      new Vector4().addVectors(
        new Vector4(1, 2, 3, 4),
        new Vector4(4, 3, 2, 1),
      ),
    ).toMatchVector({
      x: 5,
      y: 5,
      z: 5,
      w: 5,
    });
    expect(
      new Vector4().subVectors(
        new Vector4(4, 3, 2, 1),
        new Vector4(1, 2, 3, 4),
      ),
    ).toMatchVector({
      x: 3,
      y: 1,
      z: -1,
      w: -3,
    });
  });

  it("length", () => {
    const e = new Vector4(1, 0, 0, 0);
    expect(e.length).toBeCloseTo(1);
  });

  it("lengthSq is getter", () => {
    const e = new Vector4(2, 2, 2, 2);
    expect(e.lengthSq).toBeCloseTo(16);
  });

  it("normalize", () => {
    const e = new Vector4(2, 0, 0, 0).normalize();
    expect(e.length).toBeCloseTo(1);
  });

  it("component accessors, rounding and clamping", () => {
    const e = new Vector4(1.8, -2.2, 3.5, -4.5);
    expect(e.getComponent(2)).toBe(3.5);
    expect(() => e.getComponent(4)).toThrow(RangeError);
    e.setComponent(0, 9);
    e.w = 8;
    e.x = 7;
    e.y = 6;
    e.z = 5;
    expect(e).toMatchVector({ x: 7, y: 6, z: 5, w: 8 });
    expect(() => e.setComponent(-1, 0)).toThrow(RangeError);
    expect(new Vector4(1.2, -1.2, 2.8, -2.8).floor()).toMatchVector({
      x: 1,
      y: -2,
      z: 2,
      w: -3,
    });
    expect(new Vector4(1.2, -1.2, 2.8, -2.8).ceil()).toMatchVector({
      x: 2,
      y: -1,
      z: 3,
      w: -2,
    });
    expect(new Vector4(1.6, -1.6, 2.4, -2.4).round()).toMatchVector({
      x: 2,
      y: -2,
      z: 2,
      w: -2,
    });
    expect(new Vector4(1.6, -1.6, 2.4, -2.4).roundToZero()).toMatchVector({
      x: 1,
      y: -1,
      z: 2,
      w: -2,
    });
    const clamped = new Vector4(-2, 0.5, 4, 8).clampScalar(0, 1);
    expect(clamped).toMatchVector({ x: 0, y: 0.5, z: 1, w: 1 });
    expect(new Vector4(2, 0, 0, 0).clampLength(1, 1.5).length).toBeCloseTo(1.5);
    expect(new Vector4(0, 0, 0, 0).clampLength(1, 2).length).toBe(0);
    expect(new Vector4(1, -2, 3, -4).manhattanLength).toBe(10);
  });

  it("applyMatrix4 matches THREE", () => {
    const matrix = new Matrix4()
      .makeTranslation(2, -3, 4)
      .multiply(new Matrix4().makeScale(2, 3, 4));
    const values = new Vector4(1, -2, 0.5, 2);
    const e = values.clone().applyMatrix4(matrix);
    expect(e).toMatchVector({ x: 6, y: -12, z: 10, w: 2 }, 1e-5);
  });

  it("axis-angle conversion matches THREE", () => {
    const q = {
      x: 0,
      y: Math.sin(Math.PI / 8),
      z: 0,
      w: Math.cos(Math.PI / 8),
    };
    const e = new Vector4().setAxisAngleFromQuaternion(q);
    expect(e).toMatchVector({ x: 0, y: 1, z: 0, w: Math.PI / 4 }, 1e-6);
    expect(
      new Vector4().setAxisAngleFromRotationMatrix(new Matrix4().identity()),
    ).toMatchVector({
      x: 1,
      y: 0,
      z: 0,
      w: 0,
    });
  });

  it("array and dot operations", () => {
    const e = new Vector4(1, 2, 3, 4);
    const target = [99, 99, 99, 99, 99, 99, 99, 99];
    expect(e.toArray(target, 2)).toEqual([99, 99, 1, 2, 3, 4, 99, 99]);
    expect(new Vector4().fromArray(target, 2)).toMatchVector(e);
    expect(e.dot(new Vector4(2, 3, 4, 5))).toBe(40);
    expect(e.clone().negate()).toMatchVector({ x: -1, y: -2, z: -3, w: -4 });
  });

  it("clone", () => {
    const orig = new Vector4(1, 2, 3, 4);
    const c = orig.clone();
    expect(c).toMatchVector({ x: 1, y: 2, z: 3, w: 4 });
    c.set(9, 9, 9, 9);
    expect(orig.x).toBe(1);
  });

  it("equals", () => {
    const a = new Vector4(1, 2, 3, 4);
    const b = new Vector4(1, 2, 3, 4);
    expect(a.equals(b)).toBe(true);
    b.w = 5;
    expect(a.equals(b)).toBe(false);
  });
});
