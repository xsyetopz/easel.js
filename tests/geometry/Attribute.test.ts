import { describe, expect, it } from "bun:test";
import { Attribute } from "@/geometry/Attribute.js";
import { Matrix4 } from "@/math/Matrix4.ts";
import { BufferAttribute as THREEBufferAttribute } from "three";

describe("Attribute", () => {
  describe("constructor", () => {
    it("wraps a Float32Array", () => {
      const arr = new Float32Array([1, 2, 3, 4, 5, 6]);
      const attr = new Attribute(arr, 3);
      expect(attr.array).toBe(arr);
      expect(attr.itemSize).toBe(3);
    });

    it("converts plain array to Float32Array", () => {
      const attr = new Attribute([1, 2, 3, 4], 2);
      expect(attr.array).toBeInstanceOf(Float32Array);
      expect(Array.from(attr.array)).toEqual([1, 2, 3, 4]);
    });

    it("accepts Uint16Array", () => {
      const arr = new Uint16Array([0, 1, 2]);
      const attr = new Attribute(arr, 1);
      expect(attr.array).toBe(arr);
    });

    it("accepts every CPU numeric typed-array representation", () => {
      const arrays = [
        new Float32Array(1),
        new Int8Array(1),
        new Uint8Array(1),
        new Uint8ClampedArray(1),
        new Int16Array(1),
        new Uint16Array(1),
        new Int32Array(1),
        new Uint32Array(1),
      ];
      for (const array of arrays) {
        expect(new Attribute(array, 1).array).toBe(array);
      }
    });

    it("rejects invalid item shapes instead of retaining fractional counts", () => {
      expect(() => new Attribute(new Float32Array(2), 0)).toThrow(RangeError);
      expect(() => new Attribute(new Float32Array(3), 2)).toThrow(RangeError);
    });
  });

  describe("count", () => {
    it("returns array.length / itemSize", () => {
      const attr = new Attribute(new Float32Array(12), 3);
      expect(attr.count).toBe(4);
    });

    it("returns correct count for itemSize=2", () => {
      const attr = new Attribute(new Float32Array(8), 2);
      expect(attr.count).toBe(4);
    });
  });

  describe("getX / getY / getZ / getW", () => {
    it("reads components by index", () => {
      const attr = new Attribute(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]), 4);
      expect(attr.getX(0)).toBe(1);
      expect(attr.getY(0)).toBe(2);
      expect(attr.getZ(0)).toBe(3);
      expect(attr.getW(0)).toBe(4);
      expect(attr.getX(1)).toBe(5);
      expect(attr.getY(1)).toBe(6);
      expect(attr.getZ(1)).toBe(7);
      expect(attr.getW(1)).toBe(8);
    });

    it("getX on stride-3 attribute", () => {
      const attr = new Attribute(new Float32Array([10, 20, 30, 40, 50, 60]), 3);
      expect(attr.getX(0)).toBe(10);
      expect(attr.getX(1)).toBe(40);
      expect(attr.getZ(1)).toBe(60);
    });
  });

  describe("setX", () => {
    it("sets x component and returns this", () => {
      const attr = new Attribute(new Float32Array(6), 3);
      const ret = attr.setX(1, 99);
      expect(ret).toBe(attr);
      expect(attr.getX(1)).toBe(99);
    });
  });

  describe("normalized integer storage", () => {
    it("matches THREE.js signed and unsigned component conversion", () => {
      const arrays = [
        new Int8Array([-128, 127]),
        new Uint8Array([0, 255]),
        new Int16Array([-32768, 32767]),
        new Uint16Array([0, 65535]),
        new Int32Array([-2147483648, 2147483647]),
        new Uint32Array([0, 4294967295]),
      ];
      for (const array of arrays) {
        const EASEL = new Attribute(array.slice(), 1, true);
        const THREE = new THREEBufferAttribute(array.slice(), 1, true);
        expect(EASEL.getX(0)).toBe(THREE.getX(0));
        expect(EASEL.getX(1)).toBe(THREE.getX(1));
        EASEL.setX(0, -0.5).setX(1, 0.5);
        THREE.setX(0, -0.5).setX(1, 0.5);
        expect(Array.from(EASEL.array)).toEqual(Array.from(THREE.array));
      }
    });

    it("supports Uint8ClampedArray without inheriting THREE.js's type error", () => {
      const attribute = new Attribute(new Uint8ClampedArray(2), 1, true);
      attribute.setX(0, 0.25).setX(1, 0.75);
      expect(Array.from(attribute.array)).toEqual([64, 191]);
      expect(attribute.getX(0)).toBeCloseTo(64 / 255);
      expect(attribute.getX(1)).toBeCloseTo(191 / 255);
    });
  });

  describe("setXY", () => {
    it("sets x and y components", () => {
      const attr = new Attribute(new Float32Array(4), 2);
      attr.setXY(1, 7, 8);
      expect(attr.getX(1)).toBe(7);
      expect(attr.getY(1)).toBe(8);
    });

    it("returns this", () => {
      const attr = new Attribute(new Float32Array(4), 2);
      expect(attr.setXY(0, 1, 2)).toBe(attr);
    });
  });

  describe("setXYZ", () => {
    it("sets x, y, z components", () => {
      const attr = new Attribute(new Float32Array(6), 3);
      attr.setXYZ(0, 1, 2, 3);
      expect(attr.getX(0)).toBe(1);
      expect(attr.getY(0)).toBe(2);
      expect(attr.getZ(0)).toBe(3);
    });

    it("does not clobber adjacent vertex", () => {
      const attr = new Attribute(new Float32Array(6), 3);
      attr.setXYZ(0, 1, 2, 3);
      attr.setXYZ(1, 4, 5, 6);
      expect(attr.getX(0)).toBe(1);
      expect(attr.getX(1)).toBe(4);
    });

    it("returns this", () => {
      const attr = new Attribute(new Float32Array(3), 3);
      expect(attr.setXYZ(0, 1, 2, 3)).toBe(attr);
    });
  });

  describe("clone", () => {
    it("returns a new Attribute with same data", () => {
      const attr = new Attribute(new Float32Array([1, 2, 3]), 3);
      const copy = attr.clone();
      expect(copy).not.toBe(attr);
      expect(Array.from(copy.array)).toEqual([1, 2, 3]);
      expect(copy.itemSize).toBe(3);
    });

    it("clone is independent - mutation does not affect original", () => {
      const attr = new Attribute(new Float32Array([1, 2, 3]), 3);
      const copy = attr.clone();
      copy.setX(0, 99);
      expect(attr.getX(0)).toBe(1);
    });
  });

  describe("CPU attribute operations", () => {
    it("copies components through normalized value semantics", () => {
      const source = new Attribute(new Uint8Array([255, 128]), 2, true);
      const destination = new Attribute(new Uint16Array(2), 2, true);
      expect(destination.copyAt(0, source, 0)).toBe(destination);
      expect(destination.getX(0)).toBe(1);
      expect(destination.getY(0)).toBeCloseTo(128 / 255, 4);
    });

    it("applies matrices explicitly", () => {
      const attribute = new Attribute(new Float32Array([1, 2, 3]), 3);
      expect(
        attribute.applyMatrix4(new Matrix4().makeTranslation(4, 5, 6)),
      ).toBe(attribute);
      expect(Array.from(attribute.array)).toEqual([5, 7, 9]);
    });

    it("serializes storage type, normalization, and optional name", () => {
      const attribute = new Attribute(new Int16Array([1, 2]), 2, true);
      attribute.name = "weights";
      expect(attribute.toJSON()).toEqual({
        itemSize: 2,
        type: "Int16Array",
        array: [1, 2],
        normalized: true,
        name: "weights",
      });
    });
  });

  describe("needsUpdate flag", () => {
    it("defaults to false", () => {
      const attr = new Attribute(new Float32Array(3), 3);
      expect(attr.needsUpdate).toBe(false);
    });

    it("can be set to true", () => {
      const attr = new Attribute(new Float32Array(3), 3);
      attr.needsUpdate = true;
      expect(attr.needsUpdate).toBe(true);
    });
  });
});
