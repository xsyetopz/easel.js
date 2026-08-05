import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import { Vector3 as TVector3, Vector4 as TVector4 } from "three";
import { Cylindrical } from "@/math/Cylindrical.js";
import { Euler } from "@/math/Euler.js";
import { Matrix3 } from "@/math/Matrix3.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { cross3, dot3, Vector3 } from "@/math/Vector3.js";
import { Vector4 } from "@/math/Vector4.js";

describe("Vector3", () => {
  it("provides top-level component operations", () => {
    expect(cross3(1, 0, 0, 0, 1, 0)).toMatchVector({ x: 0, y: 0, z: 1 });
    expect(dot3(1, 2, 3, new Vector3(4, 5, 6))).toBe(32);
  });

  it("constructor defaults", () => {
    const e = new Vector3();
    const t = new TVector3();
    expect(e.x).toBe(t.x);
    expect(e.y).toBe(t.y);
    expect(e.z).toBe(t.z);
  });

  it("set", () => {
    const e = new Vector3().set(1, 2, 3);
    expect(e).toMatchVector({ x: 1, y: 2, z: 3 });
  });

  it("add", () => {
    const e = new Vector3(1, 2, 3).add(new Vector3(4, 5, 6));
    const t = new TVector3(1, 2, 3).add(new TVector3(4, 5, 6));
    expect(e).toMatchVector(t);
    expect(
      new Vector3(1, 2, 3).addScaledVector(new Vector4(4, 5, 6, 7), 0.5),
    ).toMatchVector(
      new TVector3(1, 2, 3).addScaledVector(new TVector4(4, 5, 6, 7), 0.5),
    );
  });

  it("sub", () => {
    const e = new Vector3(5, 7, 9).sub(new Vector3(1, 2, 3));
    const t = new TVector3(5, 7, 9).sub(new TVector3(1, 2, 3));
    expect(e).toMatchVector(t);
  });

  it("multiplyScalar", () => {
    const e = new Vector3(1, 2, 3).multiplyScalar(3);
    const t = new TVector3(1, 2, 3).multiplyScalar(3);
    expect(e).toMatchVector(t);
  });

  it("divideScalar", () => {
    const e = new Vector3(4, 6, 8).divideScalar(2);
    const t = new TVector3(4, 6, 8).divideScalar(2);
    expect(e).toMatchVector(t);
  });

  it("length", () => {
    const e = new Vector3(1, 2, 3);
    const t = new TVector3(1, 2, 3);
    expect(e.length).toBeCloseTo(t.length());
  });

  it("lengthSq is getter", () => {
    const e = new Vector3(1, 2, 3);
    const t = new TVector3(1, 2, 3);
    expect(e.lengthSq).toBeCloseTo(t.lengthSq());
  });

  it("normalize", () => {
    const e = new Vector3(3, 0, 0).normalize();
    expect(e.length).toBeCloseTo(1);
  });

  it("dot", () => {
    const e = new Vector3(1, 2, 3);
    const other = new Vector3(4, 5, 6);
    const t = new TVector3(1, 2, 3);
    expect(e.dot(other)).toBeCloseTo(t.dot(new TVector3(4, 5, 6)));
  });

  it("cross", () => {
    const e = new Vector3(1, 0, 0).cross(new Vector3(0, 1, 0));
    const t = new TVector3(1, 0, 0).cross(new TVector3(0, 1, 0));
    expect(e).toMatchVector(t);
  });

  it("crossVectors", () => {
    const a = new Vector3(1, 0, 0);
    const b = new Vector3(0, 1, 0);
    const e = new Vector3().crossVectors(a, b);
    const t = new TVector3().crossVectors(
      new TVector3(1, 0, 0),
      new TVector3(0, 1, 0),
    );
    expect(e).toMatchVector(t);
  });

  it("negate", () => {
    const e = new Vector3(1, -2, 3).negate();
    expect(e).toMatchVector({ x: -1, y: 2, z: -3 });
  });

  it("distanceTo", () => {
    const e = new Vector3(0, 0, 0).distanceTo(new Vector3(3, 4, 0));
    const t = new TVector3(0, 0, 0).distanceTo(new TVector3(3, 4, 0));
    expect(e).toBeCloseTo(t);
  });

  it("lerp", () => {
    const e = new Vector3(0, 0, 0).lerp(new Vector3(10, 10, 10), 0.5);
    const t = new TVector3(0, 0, 0).lerp(new TVector3(10, 10, 10), 0.5);
    expect(e).toMatchVector(t);
  });

  it("clone", () => {
    const orig = new Vector3(1, 2, 3);
    const c = orig.clone();
    expect(c).toMatchVector({ x: 1, y: 2, z: 3 });
    c.set(9, 9, 9);
    expect(orig.x).toBe(1);
  });

  it("equals", () => {
    expect(new Vector3(1, 2, 3).equals(new Vector3(1, 2, 3))).toBe(true);
    expect(new Vector3(1, 2, 3).equals(new Vector3(1, 2, 4))).toBe(false);
  });

  it("fromArray", () => {
    const e = new Vector3().fromArray([7, 8, 9]);
    expect(e).toMatchVector({ x: 7, y: 8, z: 9 });
  });

  it("zero vector normalize returns zero-ish", () => {
    // divideScalar(0 || 1) produces no NaN.
    const e = new Vector3(0, 0, 0).normalize();
    expect(Number.isNaN(e.x)).toBe(false);
  });

  it("supports scalar, scaled, and component-wise arithmetic", () => {
    const e = new Vector3(1, 2, 3)
      .addScalar(2)
      .addScaledVector(new Vector3(2, 3, 4), 2)
      .subScalar(1)
      .multiply(new Vector3(2, 3, 4))
      .divide(new Vector3(2, 5, 4));
    const t = new TVector3(1, 2, 3)
      .addScalar(2)
      .addScaledVector(new TVector3(2, 3, 4), 2)
      .subScalar(1)
      .multiply(new TVector3(2, 3, 4))
      .divide(new TVector3(2, 5, 4));
    expect(e).toMatchVector(t);
    expect(
      new Vector3().addVectors(new Vector3(1, 2, 3), new Vector3(4, 5, 6)),
    ).toMatchVector({
      x: 5,
      y: 7,
      z: 9,
    });
    expect(
      new Vector3().subVectors(new Vector3(5, 7, 9), new Vector3(1, 2, 3)),
    ).toMatchVector({
      x: 4,
      y: 5,
      z: 6,
    });
    expect(
      new Vector3().multiplyVectors(new Vector3(2, 3, 4), new Vector3(4, 5, 6)),
    ).toMatchVector({
      x: 8,
      y: 15,
      z: 24,
    });
  });

  it("provides angles, distances, and Manhattan length as properties", () => {
    const e = new Vector3(2, 3, 6);
    const t = new TVector3(2, 3, 6);
    expect(e.angleTo(new Vector3(-6, 3, 2))).toBeCloseTo(
      t.angleTo(new TVector3(-6, 3, 2)),
    );
    expect(e.distanceToSquared(new Vector3())).toBe(49);
    expect(e.manhattanDistanceTo(new Vector3())).toBe(11);
    expect(e.manhattanLength).toBe(11);
  });

  it("applies axis and normal transforms", () => {
    const axis = new Vector3(0, 0, 1);
    const e = new Vector3(1, 0, 0).applyAxisAngle(axis, Math.PI / 2);
    const t = new TVector3(1, 0, 0).applyAxisAngle(
      new TVector3(0, 0, 1),
      Math.PI / 2,
    );
    expect(e).toMatchVector(t);
    expect(
      new Vector3(2, 0, 0).applyNormalMatrix(new Matrix3().identity()),
    ).toMatchVector({
      x: 1,
      y: 0,
      z: 0,
    });
  });

  it("projects and reflects without allocating result vectors", () => {
    expect(
      new Vector3(2, 3, 0).projectOnVector(new Vector3(1, 0, 0)),
    ).toMatchVector({
      x: 2,
      y: 0,
      z: 0,
    });
    expect(
      new Vector3(2, 3, 4).projectOnPlane(new Vector3(0, 1, 0)),
    ).toMatchVector({
      x: 2,
      y: 0,
      z: 4,
    });
    expect(new Vector3(2, -3, 4).reflect(new Vector3(0, 1, 0))).toMatchVector({
      x: 2,
      y: 3,
      z: 4,
    });
    expect(new Vector3(1, 2, 3).projectOnVector(new Vector3())).toMatchVector({
      x: 0,
      y: 0,
      z: 0,
    });
  });

  it("supports component access, matrix columns, and array offsets", () => {
    const matrix = new Matrix4().makeTranslation(7, 8, 9);
    const e = new Vector3().setScalar(2);
    e.x = 3;
    e.y = 4;
    e.z = 5;
    expect(e.getComponent(0)).toBe(3);
    expect(e.getComponent(1)).toBe(4);
    expect(e.getComponent(2)).toBe(5);
    expect(() => e.getComponent(3)).toThrow();
    expect(() => e.setComponent(-1, 0)).toThrow();
    expect(e.setComponent(0, 8)).toBe(e);
    expect(new Vector3().setFromMatrixPosition(matrix)).toMatchVector({
      x: 7,
      y: 8,
      z: 9,
    });
    expect(new Vector3().setFromMatrixColumn(matrix, 3)).toMatchVector({
      x: 7,
      y: 8,
      z: 9,
    });
    expect(
      new Vector3().setFromMatrixScale(new Matrix4().makeScale(2, 3, 4)),
    ).toMatchVector({
      x: 2,
      y: 3,
      z: 4,
    });
    expect(e.toArray([9, 9, 9, 9], 1)).toEqual([9, 8, 4, 5]);
    expect(new Vector3().fromArray([9, 8, 7, 6], 1)).toMatchVector({
      x: 8,
      y: 7,
      z: 6,
    });
  });

  it("supports cylindrical and Euler records", () => {
    expect(
      new Vector3().setFromCylindrical(new Cylindrical(2, Math.PI / 2, 3)),
    ).toMatchVector({
      x: 2,
      y: 3,
      z: 0,
    });
    expect(new Vector3().setFromCylindricalCoords(2, 0, 3)).toMatchVector({
      x: 0,
      y: 3,
      z: 2,
    });
    expect(new Vector3().setFromEuler(new Euler(1, 2, 3))).toMatchVector({
      x: 1,
      y: 2,
      z: 3,
    });
  });

  it("unprojects with a prepared projection inverse and transforms directions", () => {
    const identity = new Matrix4();
    const e = new Vector3(1, 2, 3).unproject({
      matrixWorld: identity,
      projectionMatrixInverse: identity,
    });
    expect(e).toMatchVector({ x: 1, y: 2, z: 3 });
    expect(
      new Vector3(3, 0, 0).transformDirection(new Matrix4().makeScale(2, 1, 1)),
    ).toMatchVector({
      x: 1,
      y: 0,
      z: 0,
    });
  });

  it("clamps, rounds, sets lengths, and generates bounded random vectors", () => {
    expect(new Vector3(-2.2, 1.3, 3.8).clampScalar(-1, 2)).toMatchVector({
      x: -1,
      y: 1.3,
      z: 2,
    });
    expect(new Vector3(3, 4, 0).clampLength(2, 3).length).toBeCloseTo(3);
    expect(new Vector3(1.2, -1.8, 2.9).floor()).toMatchVector({
      x: 1,
      y: -2,
      z: 2,
    });
    expect(new Vector3(1.2, -1.8, 2.9).ceil()).toMatchVector({
      x: 2,
      y: -1,
      z: 3,
    });
    expect(new Vector3(1.2, -1.8, 2.9).roundToZero()).toMatchVector({
      x: 1,
      y: -1,
      z: 2,
    });
    const vector = new Vector3(3, 4, 0);
    vector.length = 10;
    expect(vector.length).toBeCloseTo(10);
    const zero = new Vector3();
    zero.length = 10;
    expect(zero).toMatchVector({ x: 0, y: 0, z: 0 });
    const random = new Vector3().randomDirection();
    expect(random.length).toBeCloseTo(1);
  });
});
