import { describe, expect, it } from "bun:test";
import { InterleavedBuffer } from "@/geometry/InterleavedBuffer.js";

describe("InterleavedBuffer", () => {
  describe("constructor", () => {
    it("stores array and stride", () => {
      const arr = new Float32Array([1, 2, 3, 4, 5, 6]);
      const buf = new InterleavedBuffer(arr, 3);
      expect(buf.array).toBe(arr);
      expect(buf.stride).toBe(3);
    });
  });

  describe("count", () => {
    it("returns array.length / stride", () => {
      const buf = new InterleavedBuffer(new Float32Array(12), 3);
      expect(buf.count).toBe(4);
    });

    it("stride=2", () => {
      const buf = new InterleavedBuffer(new Float32Array(8), 2);
      expect(buf.count).toBe(4);
    });
  });

  describe("getX / getY / getZ / getW", () => {
    it("reads correct values by logical index", () => {
      const buf = new InterleavedBuffer(
        new Float32Array([10, 20, 30, 40, 50, 60]),
        3,
      );
      expect(buf.getX(0)).toBe(10);
      expect(buf.getY(0)).toBe(20);
      expect(buf.getZ(0)).toBe(30);
      expect(buf.getX(1)).toBe(40);
      expect(buf.getY(1)).toBe(50);
      expect(buf.getZ(1)).toBe(60);
    });

    it("getW reads 4th component", () => {
      const buf = new InterleavedBuffer(
        new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]),
        4,
      );
      expect(buf.getW(0)).toBe(4);
      expect(buf.getW(1)).toBe(8);
    });
  });

  describe("set", () => {
    it("sets values at offset", () => {
      const buf = new InterleavedBuffer(new Float32Array(6), 3);
      buf.set([7, 8, 9], 3);
      expect(buf.getX(1)).toBe(7);
      expect(buf.getY(1)).toBe(8);
      expect(buf.getZ(1)).toBe(9);
    });

    it("returns this", () => {
      const buf = new InterleavedBuffer(new Float32Array(3), 3);
      expect(buf.set([1, 2, 3], 0)).toBe(buf);
    });
  });

  describe("clone", () => {
    it("returns independent copy with same data", () => {
      const arr = new Float32Array([1, 2, 3, 4]);
      const buf = new InterleavedBuffer(arr, 2);
      const copy = buf.clone();
      expect(copy).not.toBe(buf);
      expect(copy.stride).toBe(2);
      expect(Array.from(copy.array)).toEqual([1, 2, 3, 4]);
    });

    it("mutation of clone does not affect original", () => {
      const buf = new InterleavedBuffer(new Float32Array([1, 2, 3]), 3);
      const copy = buf.clone();
      copy.array[0] = 99;
      expect(buf.getX(0)).toBe(1);
    });
  });

  describe("needsUpdate and updateRange", () => {
    it("needsUpdate defaults to false", () => {
      const buf = new InterleavedBuffer(new Float32Array(3), 3);
      expect(buf.needsUpdate).toBe(false);
    });

    it("updateRange defaults to { offset: 0, count: -1 }", () => {
      const buf = new InterleavedBuffer(new Float32Array(3), 3);
      expect(buf.updateRange).toEqual({ offset: 0, count: -1 });
    });
  });
});
