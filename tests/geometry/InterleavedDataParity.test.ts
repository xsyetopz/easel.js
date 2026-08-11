import { describe, expect, it } from "bun:test";
import { InterleavedAttribute } from "@/geometry/InterleavedAttribute.js";
import { InterleavedData } from "@/geometry/InterleavedData.js";

describe("InterleavedData constructor parity", () => {
  it("accepts every supported integer typed array", () => {
    const arrays = [
      new Int8Array(3),
      new Uint8Array(3),
      new Uint8ClampedArray(3),
      new Int16Array(3),
      new Uint16Array(3),
      new Int32Array(3),
      new Uint32Array(3),
    ];
    for (const array of arrays) {
      expect(new InterleavedData(array, 3).array).toBe(array);
    }
  });

  it("publishes the interleaved data marker", () => {
    const data = new InterleavedData(new Float32Array(3), 3);
    expect(data.isInterleavedData).toBe(true);
  });

  it("rejects invalid strides and partial records", () => {
    for (const stride of [0, -1, 1.5, Number.NaN]) {
      expect(() => new InterleavedData(new Float32Array(6), stride)).toThrow(
        RangeError,
      );
    }
    expect(() => new InterleavedData(new Float32Array(5), 3)).toThrow(
      RangeError,
    );
  });
});

describe("InterleavedData set parity", () => {
  it("defaults the offset to zero", () => {
    const data = new InterleavedData(new Float32Array(6), 3);
    expect(data.set([7, 8, 9])).toBe(data);
    expect(Array.from(data.array)).toEqual([7, 8, 9, 0, 0, 0]);
  });
});

describe("InterleavedData clone parity", () => {
  it("copies data and dirty metadata independently", () => {
    const source = new InterleavedData(new Uint16Array([1, 2, 3, 4]), 2);
    source.needsUpdate = true;
    source.updateRange = { offset: 2, count: 2 };
    const copy = source.clone();
    expect(copy).not.toBe(source);
    expect(copy.array).not.toBe(source.array);
    expect(copy.stride).toBe(source.stride);
    expect(Array.from(copy.array)).toEqual([1, 2, 3, 4]);
    expect(copy.needsUpdate).toBe(true);
    expect(copy.updateRange).toEqual({ offset: 2, count: 2 });
    expect(copy.uuid).not.toBe(source.uuid);
    copy.array[0] = 99;
    expect(source.array[0]).toBe(1);
  });

  it("copies mutable state into independent storage", () => {
    const source = new InterleavedData(new Uint16Array([1, 2, 3, 4]), 2);
    source.needsUpdate = true;
    source.updateRange = { offset: 2, count: 2 };
    const destination = new InterleavedData(new Uint16Array(4), 2);
    expect(destination.copy(source)).toBe(destination);
    expect(destination.array).not.toBe(source.array);
    expect(Array.from(destination.array)).toEqual([1, 2, 3, 4]);
    expect(destination.stride).toBe(source.stride);
    expect(destination.needsUpdate).toBe(true);
    expect(destination.updateRange).toEqual({ offset: 2, count: 2 });
    destination.array[0] = 99;
    expect(source.array[0]).toBe(1);
  });
});

describe("InterleavedData copyAt parity", () => {
  it("copies complete records and handles overlap", () => {
    const source = new InterleavedData(
      new Float32Array([10, 11, 12, 13, 20, 21, 22, 23]),
      4,
    );
    const destination = new InterleavedData(new Float32Array(8), 4);
    expect(destination.copyAt(1, source, 0)).toBe(destination);
    expect(Array.from(destination.array)).toEqual([0, 0, 0, 0, 10, 11, 12, 13]);

    const data = new Float32Array([1, 2, 3, 4, 5, 6]);
    const buffer = new InterleavedData(data, 2);
    expect(buffer.copyAt(1, buffer, 0)).toBe(buffer);
    expect(Array.from(data)).toEqual([1, 2, 1, 2, 5, 6]);
  });

  it("rejects incompatible strides and record bounds", () => {
    const destination = new InterleavedData(new Float32Array(6), 3);
    const source = new InterleavedData(new Float32Array(12), 4);
    expect(() => destination.copyAt(3, source, 0)).toThrow(RangeError);
    expect(() => destination.copyAt(0, source, 3)).toThrow(RangeError);
    expect(() => destination.copyAt(-1, destination, 0)).toThrow(RangeError);
    expect(() => destination.copyAt(2, destination, 0)).toThrow(RangeError);
    expect(() => destination.copyAt(0, destination, -1)).toThrow(RangeError);
    expect(() => destination.copyAt(0, destination, 2)).toThrow(RangeError);
    expect(() => destination.copyAt(0.5, destination, 0)).toThrow(RangeError);
    expect(() => destination.copyAt(0, destination, 0.5)).toThrow(RangeError);
  });
});

describe("InterleavedData view parity", () => {
  it("shares dirty state through attribute views", () => {
    const data = new InterleavedData(new Float32Array(6), 3);
    const first = new InterleavedAttribute(data, 3, 0);
    const second = new InterleavedAttribute(data, 3, 0);
    first.needsUpdate = true;
    expect(second.needsUpdate).toBe(true);
    second.needsUpdate = false;
    expect(first.needsUpdate).toBe(false);
  });
});
