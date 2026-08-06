import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import {
  Matrix3 as TMatrix3,
  Matrix4 as TMatrix4,
  Quaternion as TQuaternion,
  Vector3 as TVector3,
} from "three";
import { Matrix3 } from "@/math/Matrix3.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { Quaternion } from "@/math/Quaternion.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Matrix4", () => {
  it("identity on construction", () => {
    const e = new Matrix4();
    const t = new TMatrix4();
    expect(e).toMatchMatrix(t);
  });

  it("determinant of identity is 1", () => {
    expect(new Matrix4().determinant()).toBeCloseTo(1);
  });

  it("invert identity gives identity", () => {
    const e = new Matrix4().invert();
    expect(e).toMatchMatrix(new TMatrix4());
  });

  it("transpose", () => {
    const e = new Matrix4();
    const t = new TMatrix4();
    e.elements[1] = 5;
    t.elements[1] = 5;
    e.transpose();
    t.transpose();
    expect(e).toMatchMatrix(t);
  });

  it("makeTranslation", () => {
    const e = new Matrix4().makeTranslation(1, 2, 3);
    const t = new TMatrix4().makeTranslation(1, 2, 3);
    expect(e).toMatchMatrix(t);
  });

  it("makeScale", () => {
    const e = new Matrix4().makeScale(2, 3, 4);
    const t = new TMatrix4().makeScale(2, 3, 4);
    expect(e).toMatchMatrix(t);
  });

  it("makeRotationX", () => {
    const angle = Math.PI / 4;
    const e = new Matrix4().makeRotationX(angle);
    const t = new TMatrix4().makeRotationX(angle);
    expect(e).toMatchMatrix(t);
  });

  it("makeRotationY", () => {
    const angle = Math.PI / 3;
    const e = new Matrix4().makeRotationY(angle);
    const t = new TMatrix4().makeRotationY(angle);
    expect(e).toMatchMatrix(t);
  });

  it("makeRotationZ", () => {
    const angle = Math.PI / 6;
    const e = new Matrix4().makeRotationZ(angle);
    const t = new TMatrix4().makeRotationZ(angle);
    expect(e).toMatchMatrix(t);
  });

  it("multiply", () => {
    const ea = new Matrix4().makeTranslation(1, 2, 3);
    const eb = new Matrix4().makeScale(2, 2, 2);
    ea.multiply(eb);
    const ta = new TMatrix4().makeTranslation(1, 2, 3);
    const tb = new TMatrix4().makeScale(2, 2, 2);
    ta.multiply(tb);
    expect(ea).toMatchMatrix(ta);
  });

  it("multiplyMatrices", () => {
    const a = new Matrix4().makeRotationX(Math.PI / 2);
    const b = new Matrix4().makeTranslation(1, 0, 0);
    const e = new Matrix4().multiplyMatrices(a, b);
    const ta = new TMatrix4().makeRotationX(Math.PI / 2);
    const tb = new TMatrix4().makeTranslation(1, 0, 0);
    const t = new TMatrix4().multiplyMatrices(ta, tb);
    expect(e).toMatchMatrix(t);
  });

  it("multiplyMatricesAffine matches multiplyMatrices for affine inputs", () => {
    const posA = new Vector3(1, 2, 3);
    const qA = new Quaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 }, 0.7);
    const sA = new Vector3(2, 1, 3);
    const a = new Matrix4().compose(posA, qA, sA);

    const posB = new Vector3(-4, 0.5, 2);
    const qB = new Quaternion().setFromAxisAngle({ x: 1, y: 0, z: 0 }, -0.2);
    const sB = new Vector3(1, 2, 1);
    const b = new Matrix4().compose(posB, qB, sB);

    const eAffine = new Matrix4().multiplyMatricesAffine(a, b);
    const eFull = new Matrix4().multiplyMatrices(a, b);
    expect(eAffine).toMatchMatrix(eFull);
  });

  it("compose / decompose round-trip", () => {
    const pos = new Vector3(1, 2, 3);
    const q = new Quaternion().setFromAxisAngle(
      { x: 0, y: 1, z: 0 },
      Math.PI / 4,
    );
    const scale = new Vector3(2, 2, 2);
    const m = new Matrix4().compose(pos, q, scale);

    const pos2 = new Vector3();
    const q2 = new Quaternion();
    const scale2 = new Vector3();
    m.decompose(pos2, q2, scale2);

    expect(pos2).toMatchVector(pos, 1e-5);
    expect(scale2).toMatchVector(scale, 1e-5);
  });

  it("compose matches THREE for axis-only quaternions", () => {
    const pos = new Vector3(1.5, -2, 3);
    const scale = new Vector3(2, 3, 4);
    const tPos = new TVector3(pos.x, pos.y, pos.z);
    const tScale = new TVector3(scale.x, scale.y, scale.z);

    const axes = [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ];
    const angles = [0, 0.3, -1.2, Math.PI / 2];
    for (const axis of axes) {
      for (const angle of angles) {
        const q = new Quaternion().setFromAxisAngle(axis, angle);
        const tq = new TQuaternion().setFromAxisAngle(axis, angle);
        const e = new Matrix4().compose(pos, q, scale);
        const t = new TMatrix4().compose(tPos, tq, tScale);
        expect(e).toMatchMatrix(t, 1e-6);
      }
    }
  });

  it("clone", () => {
    const orig = new Matrix4().makeTranslation(5, 6, 7);
    const c = orig.clone();
    expect(c).toMatchMatrix(orig);
    c.identity();
    expect(orig.elements[12]).toBe(5);
  });

  it("makeOrthographic", () => {
    const e = new Matrix4().makeOrthographic(-1, 1, 1, -1, 0.1, 100);
    const t = new TMatrix4().makeOrthographic(-1, 1, 1, -1, 0.1, 100);
    expect(e).toMatchMatrix(t);
  });

  it("copies position and sets position from vectors or scalars", () => {
    const source = new Matrix4().makeTranslation(4, 5, 6);
    const e = new Matrix4().makeScale(2, 3, 4).copyPosition(source);
    expect(e.elements[12]).toBe(4);
    expect(e.elements[13]).toBe(5);
    expect(e.elements[14]).toBe(6);
    e.setPosition(new Vector3(-1, -2, -3));
    expect([e.elements[12], e.elements[13], e.elements[14]]).toEqual([
      -1, -2, -3,
    ]);
    e.setPosition(7, 8, 9);
    expect([e.elements[12], e.elements[13], e.elements[14]]).toEqual([7, 8, 9]);
  });

  it("converts Matrix3 values and extracts or creates a basis", () => {
    const source = new Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const e = new Matrix4().setFromMatrix3(source);
    const t = new TMatrix4().setFromMatrix3(
      new TMatrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9),
    );
    expect(e).toMatchMatrix(t);

    const x = new Vector3();
    const y = new Vector3();
    const z = new Vector3();
    new Matrix4()
      .makeBasis(
        new Vector3(1, 2, 3),
        new Vector3(4, 5, 6),
        new Vector3(7, 8, 10),
      )
      .extractBasis(x, y, z);
    expect(x).toMatchVector({ x: 1, y: 2, z: 3 });
    expect(y).toMatchVector({ x: 4, y: 5, z: 6 });
    expect(z).toMatchVector({ x: 7, y: 8, z: 10 });
  });

  it("matches THREE for scalar, pre-matrix, and basis scale operations", () => {
    const e = new Matrix4().set(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
    );
    const t = new TMatrix4().set(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
    );
    const em = new Matrix4().makeTranslation(2, 3, 4);
    const tm = new TMatrix4().makeTranslation(2, 3, 4);
    e.premultiply(em)
      .multiplyScalar(1.5)
      .scale(new Vector3(2, 3, 4));
    t.premultiply(tm)
      .multiplyScalar(1.5)
      .scale(new TVector3(2, 3, 4));
    expect(e).toMatchMatrix(t);
  });

  it("matches THREE for axis rotation, shear, determinant, and max scale", () => {
    const axis = new Vector3(1, 2, 3).normalize();
    const e = new Matrix4().makeRotationAxis(axis, 0.8);
    const t = new TMatrix4().makeRotationAxis(
      new TVector3(1, 2, 3).normalize(),
      0.8,
    );
    expect(e).toMatchMatrix(t);
    expect(e.determinantAffine()).toBeCloseTo(t.determinantAffine());
    expect(e.maxScaleOnAxis).toBeCloseTo(t.getMaxScaleOnAxis());

    const es = new Matrix4().makeShear(1, 2, 3, 4, 5, 6);
    const ts = new TMatrix4().makeShear(1, 2, 3, 4, 5, 6);
    expect(es).toMatchMatrix(ts);
  });

  it("copies arrays, compares, and writes with offsets", () => {
    const values = Array.from({ length: 18 }, (_, index) => index - 1);
    const e = new Matrix4().fromArray(values, 1);
    const t = new TMatrix4().fromArray(values, 1);
    expect(e.equals(new Matrix4().copy(e))).toBe(true);
    expect(e).toMatchMatrix(t);
    const output = [
      99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
    ];
    expect(e.toArray(output, 1)).toBe(output);
    expect(output.slice(1, 17)).toEqual(Array.from(e.elements));
  });
});
