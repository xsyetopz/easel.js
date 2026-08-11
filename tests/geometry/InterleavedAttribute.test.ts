import { describe, expect, it } from "bun:test";
import { InterleavedAttribute } from "@/geometry/InterleavedAttribute.js";
import { InterleavedData } from "@/geometry/InterleavedData.js";

function makeAttr(
  data: ArrayLike<number>,
  stride: number,
  itemSize: number,
  offset: number,
): InterleavedAttribute {
  const buf = new InterleavedData(new Float32Array(data), stride);
  return new InterleavedAttribute(buf, itemSize, offset);
}

describe("constructor", () => {
  it("stores data ref, itemSize, offset", () => {
    const buf = new InterleavedData(new Float32Array(6), 3);
    const attr = new InterleavedAttribute(buf, 3, 0);
    expect(attr.data).toBe(buf);
    expect(attr.itemSize).toBe(3);
    expect(attr.offset).toBe(0);
  });
});

describe("count", () => {
  it("delegates to data.count", () => {
    const attr = makeAttr([1, 2, 3, 4, 5, 6], 3, 3, 0);
    expect(attr.count).toBe(2);
  });
});

describe("array", () => {
  it("returns the underlying array from data", () => {
    const buf = new InterleavedData(new Float32Array([1, 2, 3]), 3);
    const attr = new InterleavedAttribute(buf, 3, 0);
    expect(attr.array).toBe(buf.array);
  });
});

describe("getX / getY / getZ / getW", () => {
  it("reads with correct stride + offset", () => {
    // stride=5: [px, py, pz, u, v, px, py, pz, u, v]
    // position attr: itemSize=3, offset=0
    const data = [1, 2, 3, 0.1, 0.2, 4, 5, 6, 0.3, 0.4];
    const attr = makeAttr(data, 5, 3, 0);
    expect(attr.getX(0)).toBeCloseTo(1);
    expect(attr.getY(0)).toBeCloseTo(2);
    expect(attr.getZ(0)).toBeCloseTo(3);
    expect(attr.getX(1)).toBeCloseTo(4);
    expect(attr.getY(1)).toBeCloseTo(5);
  });

  it("reads UV channel at offset=3", () => {
    const data = [1, 2, 3, 0.5, 0.75, 4, 5, 6, 0.25, 0.1];
    const attr = makeAttr(data, 5, 2, 3);
    expect(attr.getX(0)).toBeCloseTo(0.5);
    expect(attr.getY(0)).toBeCloseTo(0.75);
    expect(attr.getX(1)).toBeCloseTo(0.25);
  });
});

describe("setX / setY / setZ / setW", () => {
  it("writes with correct stride + offset and returns this", () => {
    const buf = new InterleavedData(new Float32Array(6), 3);
    const attr = new InterleavedAttribute(buf, 3, 0);
    const ret = attr.setX(1, 99);
    expect(ret).toBe(attr);
    expect(attr.getX(1)).toBe(99);
  });

  it("setY / setZ write correct slots", () => {
    const buf = new InterleavedData(new Float32Array(6), 3);
    const attr = new InterleavedAttribute(buf, 3, 0);
    attr.setY(0, 7);
    attr.setZ(0, 8);
    expect(attr.getY(0)).toBe(7);
    expect(attr.getZ(0)).toBe(8);
  });

  it("does not clobber adjacent channel when using offset", () => {
    const data = new Float32Array(10); // stride=5
    const buf = new InterleavedData(data, 5);
    const posAttr = new InterleavedAttribute(buf, 3, 0);
    const uvAttr = new InterleavedAttribute(buf, 2, 3);
    posAttr.setX(0, 1);
    posAttr.setY(0, 2);
    posAttr.setZ(0, 3);
    uvAttr.setX(0, 0.5);
    uvAttr.setY(0, 0.9);
    expect(posAttr.getX(0)).toBe(1);
    expect(posAttr.getY(0)).toBe(2);
    expect(posAttr.getZ(0)).toBe(3);
    expect(uvAttr.getX(0)).toBeCloseTo(0.5);
    expect(uvAttr.getY(0)).toBeCloseTo(0.9);
  });
});
