import { describe, expect, it } from "bun:test";
import { InterleavedAttribute } from "@/geometry/InterleavedAttribute.js";
import { InterleavedData } from "@/geometry/InterleavedData.js";
import { Matrix3 } from "@/math/Matrix3.js";
import { Matrix4 } from "@/math/Matrix4.js";

describe("InterleavedAttribute transform parity", () => {
  it("applies transforms to xyz records and preserves adjacent channels", () => {
    const data = new Float32Array([1, 2, 3, 9, 4, 5, 6, 8]);
    const attr = new InterleavedAttribute(new InterleavedData(data, 4), 3, 0);
    expect(attr.applyMatrix4(new Matrix4().makeTranslation(1, 2, 3))).toBe(
      attr,
    );
    expect(Array.from(data)).toEqual([2, 4, 6, 9, 5, 7, 9, 8]);

    expect(
      attr.applyNormalMatrix(new Matrix3().set(2, 0, 0, 0, 3, 0, 0, 0, 4)),
    ).toBe(attr);
    expect(attr.getX(0)).toBeCloseTo(4 / Math.sqrt(736));
    expect(attr.getY(0)).toBeCloseTo(12 / Math.sqrt(736));
    expect(attr.getZ(0)).toBeCloseTo(24 / Math.sqrt(736));
  });

  it("transforms directions without touching adjacent channels", () => {
    const direction = new InterleavedAttribute(
      new InterleavedData(new Float32Array([3, 4, 0, 7]), 4),
      3,
      0,
    );
    expect(
      direction.transformDirection(new Matrix4().makeTranslation(8, 9, 10)),
    ).toBe(direction);
    expect(direction.getX(0)).toBeCloseTo(0.6);
    expect(direction.getY(0)).toBeCloseTo(0.8);
    expect(direction.getZ(0)).toBe(0);
    expect(direction.array[3]).toBe(7);
  });
});
