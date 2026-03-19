import { describe, expect, it } from "vitest";
import { Attribute } from "@/geometry/Attribute.js";

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
