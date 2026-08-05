import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { Matrix2 } from "@/math/Matrix2.js";

interface Matrix2Like {
  elements: number[];
  fromArray(array: number[], offset?: number): Matrix2Like;
  set(n11: number, n12: number, n21: number, n22: number): Matrix2Like;
}

interface Matrix2Constructor {
  new (): Matrix2Like;
  new (n11: number, n12: number, n21: number, n22: number): Matrix2Like;
}

const THREEMatrix2 = (THREE as unknown as { Matrix2: Matrix2Constructor })
  .Matrix2;

function expectElementsMatch(EASEL: Matrix2, THREE: Matrix2Like): void {
  expect(Array.from(EASEL.elements)).toEqual(THREE.elements);
}

describe("Matrix2", () => {
  it("constructs the identity matrix", () => {
    expectElementsMatch(new Matrix2(), new THREEMatrix2());
  });

  it("matches THREE.js row-major constructor semantics", () => {
    expectElementsMatch(
      new Matrix2(11, 12, 21, 22),
      new THREEMatrix2(11, 12, 21, 22),
    );
  });

  it("rejects partial constructor values instead of storing undefined", () => {
    const UnsafeMatrix2 = Matrix2 as unknown as new (
      ...values: number[]
    ) => Matrix2;
    expect(() => new UnsafeMatrix2(1, 2)).toThrow(TypeError);
  });

  it("sets row-major arguments into column-major storage", () => {
    const EASEL = new Matrix2().set(1, 2, 3, 4);
    const THREE = new THREEMatrix2().set(1, 2, 3, 4);
    expectElementsMatch(EASEL, THREE);
  });

  it("copies array-like column-major values with an offset", () => {
    const values = Float64Array.of(9, 9, 1, 3, 2, 4, 9);
    const EASEL = new Matrix2().fromArray(values, 2);
    const THREE = new THREEMatrix2().fromArray(Array.from(values), 2);
    expectElementsMatch(EASEL, THREE);
  });

  it("rejects an incomplete array range", () => {
    expect(() => new Matrix2().fromArray([1, 2, 3])).toThrow(RangeError);
    expect(() => new Matrix2().fromArray([1, 2, 3, 4], -1)).toThrow(RangeError);
  });

  it("returns itself from mutating methods", () => {
    const matrix = new Matrix2(1, 2, 3, 4);
    expect(matrix.identity()).toBe(matrix);
    expect(matrix.fromArray([1, 2, 3, 4])).toBe(matrix);
    expect(matrix.set(4, 3, 2, 1)).toBe(matrix);
  });
});
