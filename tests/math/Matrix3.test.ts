import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import { Matrix3 as TMatrix3 } from "three";
import { Matrix3 } from "@/math/Matrix3.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Matrix3", () => {
  it("identity on construction", () => {
    const e = new Matrix3();
    const t = new TMatrix3();
    expect(e).toMatchMatrix(t);
  });

  it("set", () => {
    const e = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const t = new TMatrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
    expect(e).toMatchMatrix(t);
  });

  it("determinant", () => {
    const e = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const t = new TMatrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
    expect(e.determinant()).toBeCloseTo(t.determinant());
  });

  it("determinant of identity is 1", () => {
    expect(new Matrix3().determinant()).toBeCloseTo(1);
  });

  it("invert", () => {
    const e = new Matrix3().set(2, 0, 0, 0, 3, 0, 0, 0, 4);
    const t = new TMatrix3().set(2, 0, 0, 0, 3, 0, 0, 0, 4);
    e.invert();
    t.invert();
    expect(e).toMatchMatrix(t);
  });

  it("invert throws on singular matrix", () => {
    const e = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
    expect(() => e.invert()).toThrow();
  });

  it("builds a zero normal matrix for singular transforms", () => {
    const normal = new Matrix3().getNormalMatrix(
      new Matrix4().makeScale(0, 1, 1),
    );
    expect(Array.from(normal.elements)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("transpose", () => {
    const e = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const t = new TMatrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
    e.transpose();
    t.transpose();
    expect(e).toMatchMatrix(t);
  });

  it("clone", () => {
    const orig = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const c = orig.clone();
    expect(c).toMatchMatrix(orig);
    c.identity();
    expect(orig.elements[1]).not.toBe(c.elements[1]);
  });

  it("multiply (post-multiply)", () => {
    const ea = new Matrix3().set(1, 0, 0, 0, 2, 0, 0, 0, 3);
    const eb = new Matrix3().set(4, 0, 0, 0, 5, 0, 0, 0, 6);
    ea.multiply(eb);
    const ta = new TMatrix3().set(1, 0, 0, 0, 2, 0, 0, 0, 3);
    const tb = new TMatrix3().set(4, 0, 0, 0, 5, 0, 0, 0, 6);
    ta.multiply(tb);
    expect(ea).toMatchMatrix(ta);
  });

  it("copies arrays, compares, and writes transposed values", () => {
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const e = new Matrix3().fromArray(values, 1);
    const t = new TMatrix3().fromArray(values, 1);
    expect(e.equals(new Matrix3().copy(e))).toBe(true);
    expect(e.equals(new Matrix3().set(0, 1, 2, 3, 4, 5, 6, 7, 99))).toBe(false);
    expect(e).toMatchMatrix(t);

    const actual = [99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99];
    expect(e.toArray(actual, 1)).toBe(actual);
    expect(actual.slice(1, 10)).toEqual(Array.from(e.elements));

    const transposed: number[] = [];
    expect(e.transposeInto(transposed)).toBe(e);
    expect(transposed).toEqual([
      e.elements[0],
      e.elements[3],
      e.elements[6],
      e.elements[1],
      e.elements[4],
      e.elements[7],
      e.elements[2],
      e.elements[5],
      e.elements[8],
    ]);
  });

  it("extracts column basis vectors", () => {
    const e = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const x = new Vector3();
    const y = new Vector3();
    const z = new Vector3();
    e.extractBasis(x, y, z);
    expect(x).toMatchVector({ x: 1, y: 4, z: 7 });
    expect(y).toMatchVector({ x: 2, y: 5, z: 8 });
    expect(z).toMatchVector({ x: 3, y: 6, z: 9 });
  });

  it("matches THREE for pre-multiplication and scalar multiplication", () => {
    const e = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 10);
    const t = new TMatrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 10);
    const em = new Matrix3().makeRotation(0.4);
    const tm = new TMatrix3().makeRotation(0.4);
    e.premultiply(em).multiplyScalar(1.5);
    t.premultiply(tm).multiplyScalar(1.5);
    expect(e).toMatchMatrix(t);
  });

  it("matches THREE for 2D post-transform helpers", () => {
    const e = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 10);
    const t = new TMatrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 10);
    e.rotate(0.4).scale(2, 3).translate(5, -2);
    t.rotate(0.4).scale(2, 3).translate(5, -2);
    expect(e).toMatchMatrix(t, 2e-6);
  });

  it("matches THREE's UV transform", () => {
    const e = new Matrix3().setUvTransform(0.2, -0.1, 2, 3, 0.7, 0.5, 0.25);
    const t = new TMatrix3().setUvTransform(0.2, -0.1, 2, 3, 0.7, 0.5, 0.25);
    expect(e).toMatchMatrix(t);
  });
});
