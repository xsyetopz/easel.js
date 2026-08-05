import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import { Vector2 as TVector2 } from "three";
import { Matrix3 } from "@/math/Matrix3.js";
import { cross2, dot2, Vector2 } from "@/math/Vector2.js";

describe("Vector2", () => {
  it("provides top-level component operations", () => {
    expect(cross2(1, 2, 3, 4)).toBe(-2);
    expect(dot2(2, 3, new Vector2(4, 5))).toBe(23);
  });

  it("constructor defaults", () => {
    const e = new Vector2();
    const t = new TVector2();
    expect(e.x).toBe(t.x);
    expect(e.y).toBe(t.y);
  });

  it("constructor with args", () => {
    const e = new Vector2(3, 4);
    expect(e.x).toBe(3);
    expect(e.y).toBe(4);
  });

  it("set", () => {
    const e = new Vector2().set(1, 2);
    const t = new TVector2().set(1, 2);
    expect(e).toMatchVector(t);
  });

  it("add", () => {
    const e = new Vector2(1, 2).add(new Vector2(3, 4));
    const t = new TVector2(1, 2).add(new TVector2(3, 4));
    expect(e).toMatchVector(t);
  });

  it("sub", () => {
    const e = new Vector2(5, 7).sub(new Vector2(2, 3));
    const t = new TVector2(5, 7).sub(new TVector2(2, 3));
    expect(e).toMatchVector(t);
  });

  it("multiplyScalar", () => {
    const e = new Vector2(2, 3).multiplyScalar(4);
    const t = new TVector2(2, 3).multiplyScalar(4);
    expect(e).toMatchVector(t);
  });

  it("clone", () => {
    const orig = new Vector2(1, 2);
    const c = orig.clone();
    expect(c).toMatchVector({ x: 1, y: 2 });
    c.set(9, 9);
    expect(orig.x).toBe(1);
  });

  it("equals", () => {
    expect(new Vector2(1, 2).equals(new Vector2(1, 2))).toBe(true);
    expect(new Vector2(1, 2).equals(new Vector2(1, 3))).toBe(false);
  });

  it("zero vector multiplyScalar", () => {
    const e = new Vector2(0, 0).multiplyScalar(99);
    expect(e).toMatchVector({ x: 0, y: 0 });
  });

  it("supports scalar, scaled, and component-wise arithmetic", () => {
    const e = new Vector2(1, 2)
      .addScalar(2)
      .addScaledVector(new Vector2(2, 3), 2)
      .subScalar(1)
      .multiply(new Vector2(2, 3))
      .divide(new Vector2(2, 5));
    expect(e).toMatchVector({ x: 6, y: 5.4 });

    const t = new TVector2(1, 2)
      .addScalar(2)
      .addScaledVector(new TVector2(2, 3), 2)
      .subScalar(1)
      .multiply(new TVector2(2, 3))
      .divide(new TVector2(2, 5));
    expect(e).toMatchVector(t);
    expect(
      new Vector2().addVectors(new Vector2(1, 2), new Vector2(3, 4)),
    ).toMatchVector({
      x: 4,
      y: 6,
    });
    expect(
      new Vector2().subVectors(new Vector2(5, 7), new Vector2(2, 3)),
    ).toMatchVector({
      x: 3,
      y: 4,
    });
    expect(
      new Vector2().multiplyVectors(new Vector2(2, 3), new Vector2(4, 5)),
    ).toMatchVector({
      x: 8,
      y: 15,
    });
  });

  it("provides angles, distances, and Manhattan length as properties", () => {
    const e = new Vector2(3, 4);
    const t = new TVector2(3, 4);
    expect(e.angle).toBeCloseTo(t.angle());
    expect(e.angleTo(new Vector2(-4, 3))).toBeCloseTo(
      t.angleTo(new TVector2(-4, 3)),
    );
    expect(e.distanceToSquared(new Vector2(0, 0))).toBe(25);
    expect(e.manhattanDistanceTo(new Vector2(0, 0))).toBe(7);
    expect(e.manhattanLength).toBe(7);
  });

  it("applies affine Matrix3 transforms", () => {
    const e = new Vector2(2, 3).applyMatrix3(
      new Matrix3().makeTranslation(4, 5),
    );
    const t = new TVector2(2, 3).applyMatrix3({
      elements: new Matrix3().makeTranslation(4, 5).elements,
    });
    expect(e).toMatchVector(t);
  });

  it("clamps and rounds without changing the API's fluent mutation style", () => {
    expect(new Vector2(-2.2, 3.8).clampScalar(-1, 2)).toMatchVector({
      x: -1,
      y: 2,
    });
    expect(
      new Vector2(-2.2, 3.8).clamp(new Vector2(-1, 0), new Vector2(1, 2)),
    ).toMatchVector({ x: -1, y: 2 });
    expect(new Vector2(3, 4).clampLength(2, 3).length).toBeCloseTo(3);
    expect(new Vector2(1.2, -1.8).floor()).toMatchVector({ x: 1, y: -2 });
    expect(new Vector2(1.2, -1.8).ceil()).toMatchVector({ x: 2, y: -1 });
    expect(new Vector2(1.2, -1.8).round()).toMatchVector({ x: 1, y: -2 });
    expect(new Vector2(1.2, -1.8).roundToZero()).toMatchVector({ x: 1, y: -1 });
  });

  it("supports component access, rotation, and array offsets", () => {
    const e = new Vector2().setScalar(2);
    e.x = 3;
    e.y = 4;
    expect(e.getComponent(0)).toBe(3);
    expect(e.getComponent(1)).toBe(4);
    expect(() => e.getComponent(2)).toThrow();
    expect(() => e.setComponent(-1, 0)).toThrow();
    expect(e.setComponent(0, 8)).toBe(e);
    expect(e.toArray([9, 9, 9], 1)).toEqual([9, 8, 4]);
    expect(new Vector2().fromArray([9, 8, 7], 1)).toMatchVector({ x: 8, y: 7 });
    expect(
      new Vector2(1, 0).rotateAround(new Vector2(), Math.PI / 2),
    ).toMatchVector({
      x: 0,
      y: 1,
    });
  });

  it("normalizes and sets lengths with the zero-vector edge case", () => {
    const vector = new Vector2(3, 4);
    vector.length = 10;
    expect(vector.length).toBeCloseTo(10);
    const zero = new Vector2();
    zero.length = 10;
    expect(zero).toMatchVector({ x: 0, y: 0 });
    const random = new Vector2().random();
    expect(random.x).toBeGreaterThanOrEqual(0);
    expect(random.x).toBeLessThan(1);
    expect(random.y).toBeGreaterThanOrEqual(0);
    expect(random.y).toBeLessThan(1);
  });
});
