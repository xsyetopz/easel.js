import { describe, expect, it } from "vitest";
import { DepthBuffer } from "@/pipeline/framebuffer/DepthBuffer.js";

describe("DepthBuffer", () => {
	it("constructor creates buffer with correct dimensions", () => {
		const db = new DepthBuffer(8, 16);
		expect(db.width).toBe(8);
		expect(db.height).toBe(16);
		expect(db.data.length).toBe(8 * 16);
	});

	it("clear() fills all values to 0xFFFF", () => {
		const db = new DepthBuffer(4, 4);
		// Dirty a few entries first
		db.testAndSet(0, 0, 100);
		db.testAndSet(3, 3, 200);
		db.clear();
		for (const val of db.data) {
			expect(val).toBe(0xffff);
		}
	});

	it("testAndSet returns true when fragment is closer than stored depth", () => {
		const db = new DepthBuffer(4, 4);
		// Default stored value is 0xFFFF; anything less is closer
		expect(db.testAndSet(1, 1, 1000)).toBe(true);
	});

	it("testAndSet returns false when fragment is farther than stored depth", () => {
		const db = new DepthBuffer(4, 4);
		db.testAndSet(2, 2, 500);
		// 1000 >= 500, so the fragment is farther
		expect(db.testAndSet(2, 2, 1000)).toBe(false);
	});

	it("testAndSet returns true when fragment depth equals stored depth", () => {
		const db = new DepthBuffer(4, 4);
		db.testAndSet(0, 0, 300);
		// Equal depth passes (coplanar fragments allowed for painter's algorithm)
		expect(db.testAndSet(0, 0, 300)).toBe(true);
	});

	it("testAndSet updates the stored depth on pass", () => {
		const db = new DepthBuffer(4, 4);
		db.testAndSet(1, 2, 800);
		const idx = 2 * 4 + 1;
		expect(db.data[idx]).toBe(800);
	});

	it("testAndSet does not update stored depth on fail", () => {
		const db = new DepthBuffer(4, 4);
		db.testAndSet(3, 1, 400);
		db.testAndSet(3, 1, 900); // farther — should not overwrite
		const idx = 1 * 4 + 3;
		expect(db.data[idx]).toBe(400);
	});

	it("resize creates new buffer with correct size and clears to 0xFFFF", () => {
		const db = new DepthBuffer(4, 4);
		db.testAndSet(0, 0, 42);
		db.resize(6, 3);
		expect(db.width).toBe(6);
		expect(db.height).toBe(3);
		expect(db.data.length).toBe(6 * 3);
		for (const val of db.data) {
			expect(val).toBe(0xffff);
		}
	});

	it("multiple writes to same pixel — closest depth wins", () => {
		const db = new DepthBuffer(8, 8);
		const x = 4;
		const y = 3;
		const idx = y * 8 + x;

		db.testAndSet(x, y, 5000);
		db.testAndSet(x, y, 2000); // closer — wins
		db.testAndSet(x, y, 8000); // farther — rejected
		db.testAndSet(x, y, 1500); // closer still — wins
		db.testAndSet(x, y, 3000); // farther than 1500 — rejected

		expect(db.data[idx]).toBe(1500);
	});
});
