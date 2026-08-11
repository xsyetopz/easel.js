import { describe, expect, it } from "bun:test";
import { Attribute } from "@/geometry/Attribute.js";
import { InterleavedAttribute } from "@/geometry/InterleavedAttribute.js";
import { InterleavedData } from "@/geometry/InterleavedData.js";

function makeAttr(
  data: ArrayLike<number>,
  stride: number,
  itemSize: number,
  offset: number,
): InterleavedAttribute {
  const buffer = new InterleavedData(new Float32Array(data), stride);
  return new InterleavedAttribute(buffer, itemSize, offset);
}

describe("InterleavedAttribute constructor parity", () => {
  it("stores normalized state and the interleaved marker", () => {
    const data = new InterleavedData(new Float32Array(6), 3);
    const normalized = new InterleavedAttribute(data, 3, 0, true);
    expect(normalized.data).toBe(data);
    expect(normalized.itemSize).toBe(3);
    expect(normalized.offset).toBe(0);
    expect(normalized.normalized).toBe(true);
    expect(normalized.isInterleavedAttribute).toBe(true);
  });

  it("defaults normalized and name state", () => {
    const attr = makeAttr([1, 2, 3], 3, 3, 0);
    expect(attr.normalized).toBe(false);
    expect(attr.name).toBe("");
  });
});

describe("InterleavedAttribute validation parity", () => {
  it("rejects invalid item sizes and channel layouts", () => {
    const data = new InterleavedData(new Float32Array(6), 3);
    for (const itemSize of [0, -1, 1.5, Number.NaN]) {
      expect(() => new InterleavedAttribute(data, itemSize, 0)).toThrow(
        RangeError,
      );
    }
    expect(() => new InterleavedAttribute(data, 2, -1)).toThrow(RangeError);
    expect(() => new InterleavedAttribute(data, 2, 1.5)).toThrow(RangeError);
    expect(() => new InterleavedAttribute(data, 2, 2)).toThrow(RangeError);
    expect(() => new InterleavedAttribute(data, 3, 1)).toThrow(RangeError);
  });

  it("rejects invalid indices and components", () => {
    const attr = makeAttr([1, 2, 3, 4, 5, 6], 3, 2, 0);
    for (const index of [-1, 2, 0.5, Number.NaN]) {
      expect(() => attr.getX(index)).toThrow(RangeError);
      expect(() => attr.setComponent(index, 0, 1)).toThrow(RangeError);
    }
    for (const component of [-1, 2, 0.5, Number.NaN]) {
      expect(() => attr.getComponent(0, component)).toThrow(RangeError);
      expect(() => attr.setComponent(0, component, 1)).toThrow(RangeError);
    }
    expect(() => attr.getZ(0)).toThrow(RangeError);
    expect(() => attr.setXYZ(0, 1, 2, 3)).toThrow(RangeError);
  });
});

describe("InterleavedAttribute component parity", () => {
  it("reads and writes arbitrary components", () => {
    const attr = makeAttr([1, 2, 3, 4, 5, 6], 3, 3, 0);
    expect(attr.getComponent(1, 2)).toBe(6);
    expect(attr.setComponent(1, 1, 42)).toBe(attr);
    expect(attr.getY(1)).toBe(42);
  });

  it("writes tuples without touching adjacent records", () => {
    const data = new Float32Array(8);
    const attr = new InterleavedAttribute(new InterleavedData(data, 4), 4, 0);
    expect(attr.setXY(0, 1, 2)).toBe(attr);
    expect(attr.setXYZ(0, 3, 4, 5)).toBe(attr);
    expect(attr.setXYZW(1, 6, 7, 8, 9)).toBe(attr);
    expect(Array.from(data)).toEqual([3, 4, 5, 0, 6, 7, 8, 9]);
  });
});

describe("InterleavedAttribute update parity", () => {
  it("shares needsUpdate across sibling views and the data store", () => {
    const data = new InterleavedData(new Float32Array(5), 5);
    const position = new InterleavedAttribute(data, 3, 0);
    const uv = new InterleavedAttribute(data, 2, 3);
    position.needsUpdate = true;
    expect(data.needsUpdate).toBe(true);
    expect(uv.needsUpdate).toBe(true);
    uv.needsUpdate = false;
    expect(position.needsUpdate).toBe(false);
    expect(data.needsUpdate).toBe(false);
  });
});

describe("InterleavedAttribute clone parity", () => {
  it("clones independently and serializes metadata", () => {
    const attr = new InterleavedAttribute(
      new InterleavedData(new Float32Array([1, 2, 3, 9, 4, 5, 6, 8]), 4),
      3,
      0,
    );
    attr.name = "position";
    attr.needsUpdate = true;
    const clone = attr.clone();
    expect(clone).toBeInstanceOf(Attribute);
    expect(clone.needsUpdate).toBe(true);
    expect(clone.toJSON()).toEqual({
      itemSize: 3,
      type: "Float32Array",
      array: [1, 2, 3, 4, 5, 6],
      normalized: false,
      name: "position",
    });
    clone.setX(0, 99);
    expect(attr.getX(0)).toBe(1);
    expect(attr.toJSON()).toEqual({
      itemSize: 3,
      type: "Float32Array",
      array: [1, 2, 3, 4, 5, 6],
      normalized: false,
      name: "position",
    });
  });
});
