import { describe, expect, it } from "vitest";
import { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";

/** Helper: append one triangle with all distinct sentinel values. */
function appendSentinel(buf) {
	return buf.append(
		10,
		20,
		30,
		40,
		50,
		60, // sx0,sy0, sx1,sy1, sx2,sy2
		0.1,
		0.2,
		0.3, // z0, z1, z2
		1,
		2,
		3, // fnx, fny, fnz
		4,
		5,
		6,
		7,
		8,
		9,
		10,
		11,
		12, // vn0xyz, vn1xyz, vn2xyz
		0.5,
		0.6,
		0.7,
		0.8,
		0.9,
		1.0, // u0,v0, u1,v1, u2,v2
	);
}

describe("TriangleBuffer", () => {
	describe("append", () => {
		it("returns the triangle index (0 for first append)", () => {
			const buf = new TriangleBuffer();
			expect(appendSentinel(buf)).toBe(0);
		});

		it("increments length after each append", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			appendSentinel(buf);
			expect(buf.length).toBe(2);
		});

		it("stores screenX and screenY correctly", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			expect(buf.screenX[0]).toBe(10);
			expect(buf.screenX[1]).toBe(30);
			expect(buf.screenX[2]).toBe(50);
			expect(buf.screenY[0]).toBe(20);
			expect(buf.screenY[1]).toBe(40);
			expect(buf.screenY[2]).toBe(60);
		});

		it("stores ndcZ correctly", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			expect(buf.ndcZ[0]).toBeCloseTo(0.1);
			expect(buf.ndcZ[1]).toBeCloseTo(0.2);
			expect(buf.ndcZ[2]).toBeCloseTo(0.3);
		});

		it("stores face normals correctly", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			expect(buf.faceNormalX[0]).toBe(1);
			expect(buf.faceNormalY[0]).toBe(2);
			expect(buf.faceNormalZ[0]).toBe(3);
		});

		it("stores vertex normals correctly", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			// vn0xyz at i3=0
			expect(buf.vertNormalX[0]).toBe(4);
			expect(buf.vertNormalY[0]).toBe(5);
			expect(buf.vertNormalZ[0]).toBe(6);
			// vn1xyz at i3+1=1
			expect(buf.vertNormalX[1]).toBe(7);
			expect(buf.vertNormalY[1]).toBe(8);
			expect(buf.vertNormalZ[1]).toBe(9);
			// vn2xyz at i3+2=2
			expect(buf.vertNormalX[2]).toBe(10);
			expect(buf.vertNormalY[2]).toBe(11);
			expect(buf.vertNormalZ[2]).toBe(12);
		});

		it("stores UV coordinates correctly", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			expect(buf.uvU[0]).toBeCloseTo(0.5);
			expect(buf.uvV[0]).toBeCloseTo(0.6);
			expect(buf.uvU[1]).toBeCloseTo(0.7);
			expect(buf.uvV[1]).toBeCloseTo(0.8);
			expect(buf.uvU[2]).toBeCloseTo(0.9);
			expect(buf.uvV[2]).toBeCloseTo(1.0);
		});

		it("computes centroidZ as (z0+z1+z2)/3", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			expect(buf.centroidZ[0]).toBeCloseTo((0.1 + 0.2 + 0.3) / 3);
		});

		it("stores second triangle at correct offsets", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			const idx = buf.append(
				1,
				2,
				3,
				4,
				5,
				6,
				1.0,
				2.0,
				3.0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
			);
			expect(idx).toBe(1);
			expect(buf.screenX[3]).toBe(1);
			expect(buf.screenX[4]).toBe(3);
			expect(buf.screenX[5]).toBe(5);
			expect(buf.centroidZ[1]).toBeCloseTo((1.0 + 2.0 + 3.0) / 3);
		});
	});

	describe("reset", () => {
		it("sets length to 0", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			appendSentinel(buf);
			buf.reset();
			expect(buf.length).toBe(0);
		});

		it("preserves capacity after reset (arrays not reallocated)", () => {
			const buf = new TriangleBuffer(16);
			appendSentinel(buf);
			const prevScreenX = buf.screenX;
			buf.reset();
			expect(buf.screenX).toBe(prevScreenX);
		});

		it("allows reuse after reset", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			buf.reset();
			const idx = buf.append(
				99,
				88,
				77,
				66,
				55,
				44,
				9.0,
				8.0,
				7.0,
				0,
				0,
				1,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
			);
			expect(idx).toBe(0);
			expect(buf.screenX[0]).toBe(99);
		});
	});

	describe("ensureCapacity", () => {
		it("does not grow when capacity is sufficient", () => {
			const buf = new TriangleBuffer(64);
			const prevScreenX = buf.screenX;
			buf.ensureCapacity(32);
			expect(buf.screenX).toBe(prevScreenX);
		});

		it("grows arrays when needed, preserving existing data", () => {
			const buf = new TriangleBuffer(2);
			appendSentinel(buf);
			appendSentinel(buf);
			// Both slots used; next append triggers growth
			appendSentinel(buf);
			expect(buf.length).toBe(3);
			// Original first triangle data preserved
			expect(buf.screenX[0]).toBe(10);
			expect(buf.centroidZ[0]).toBeCloseTo((0.1 + 0.2 + 0.3) / 3);
		});

		it("uses 2x doubling strategy", () => {
			const buf = new TriangleBuffer(1);
			appendSentinel(buf); // fills slot 0
			appendSentinel(buf); // triggers growth: 1 → 2
			appendSentinel(buf); // triggers growth: 2 → 4
			expect(buf.length).toBe(3);
			// screenX length must be at least 4*3=12
			expect(buf.screenX.length).toBeGreaterThanOrEqual(12);
		});
	});

	describe("buildSortOrder", () => {
		it("produces identity ordering [0, 1, 2, ...]", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			appendSentinel(buf);
			appendSentinel(buf);
			buf.buildSortOrder();
			expect(buf.sortOrder).toEqual([0, 1, 2]);
		});

		it("resizes sortOrder to match length", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			buf.buildSortOrder();
			expect(buf.sortOrder.length).toBe(1);
			appendSentinel(buf);
			buf.buildSortOrder();
			expect(buf.sortOrder.length).toBe(2);
		});

		it("produces empty array when length is 0", () => {
			const buf = new TriangleBuffer();
			buf.buildSortOrder();
			expect(buf.sortOrder).toEqual([]);
		});
	});

	describe("sort", () => {
		it("orders triangles back-to-front by centroidZ descending", () => {
			const buf = new TriangleBuffer();
			// near triangle: centroidZ = (1+1+1)/3 = 1
			buf.append(
				0,
				0,
				0,
				0,
				0,
				0,
				1,
				1,
				1,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
			);
			// far triangle: centroidZ = (9+9+9)/3 = 9
			buf.append(
				0,
				0,
				0,
				0,
				0,
				0,
				9,
				9,
				9,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
			);
			// mid triangle: centroidZ = (5+5+5)/3 = 5
			buf.append(
				0,
				0,
				0,
				0,
				0,
				0,
				5,
				5,
				5,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
			);

			buf.sort();

			// Back-to-front: far (index 1) first, mid (index 2) second, near (index 0) last
			expect(buf.sortOrder[0]).toBe(1);
			expect(buf.sortOrder[1]).toBe(2);
			expect(buf.sortOrder[2]).toBe(0);
		});

		it("handles a single triangle without error", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			buf.sort();
			expect(buf.sortOrder).toEqual([0]);
		});

		it("handles empty buffer without error", () => {
			const buf = new TriangleBuffer();
			buf.sort();
			expect(buf.sortOrder).toEqual([]);
		});

		it("does not mutate the centroidZ array", () => {
			const buf = new TriangleBuffer();
			appendSentinel(buf);
			appendSentinel(buf);
			const before = Array.from(buf.centroidZ.slice(0, 2));
			buf.sort();
			expect(Array.from(buf.centroidZ.slice(0, 2))).toEqual(before);
		});
	});
});
