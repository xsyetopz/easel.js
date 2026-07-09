import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { Path } from "@/curves/Path.js";
import { Shape } from "@/curves/Shape.ts";
import "../_helpers/assertions.js";

function makeSquare(x: number, y: number, size: number) {
	const s = new Shape();
	s.moveTo(x, y);
	s.lineTo(x + size, y);
	s.lineTo(x + size, y + size);
	s.lineTo(x, y + size);
	s.lineTo(x, y);
	return s;
}

function makeTHREESquare(x: number, y: number, size: number) {
	const s = new THREE.Shape();
	s.moveTo(x, y);
	s.lineTo(x + size, y);
	s.lineTo(x + size, y + size);
	s.lineTo(x, y + size);
	s.lineTo(x, y);
	return s;
}

describe("Shape vs THREE", () => {
	describe("basic shape", () => {
		const easel = makeSquare(0, 0, 2);
		const three = makeTHREESquare(0, 0, 2);

		it("getPoints(4) count matches", () => {
			expect(easel.getPoints(4).length).toBe(three.getPoints(4).length);
		});

		it("getLength matches", () => {
			expect(Math.abs(easel.getLength() - three.getLength())).toBeLessThan(
				1e-3,
			);
		});
	});

	describe("extractPoints", () => {
		it("returns shape and holes arrays", () => {
			const s = makeSquare(0, 0, 4);
			const hole = new Path();
			hole.moveTo(1, 1);
			hole.lineTo(2, 1);
			hole.lineTo(2, 2);
			hole.lineTo(1, 2);
			hole.lineTo(1, 1);
			s.holes.push(hole);

			const result = s.extractPoints(4);
			expect(Array.isArray(result.shape)).toBe(true);
			expect(Array.isArray(result.holes)).toBe(true);
			expect(result.holes.length).toBe(1);
			expect(result.holes[0].length).toBeGreaterThan(0);
		});

		it("no holes returns empty holes array", () => {
			const s = makeSquare(0, 0, 2);
			const result = s.extractPoints(4);
			expect(result.holes).toEqual([]);
		});
	});

	describe("getPointsHoles", () => {
		it("returns one array per hole", () => {
			const s = makeSquare(0, 0, 4);
			const h1 = new Path();
			h1.moveTo(0.5, 0.5);
			h1.lineTo(1.5, 0.5);
			h1.lineTo(1.5, 1.5);
			h1.lineTo(0.5, 1.5);
			h1.lineTo(0.5, 0.5);
			s.holes.push(h1);
			const holes = s.getPointsHoles(4);
			expect(holes.length).toBe(1);
		});
	});
});
