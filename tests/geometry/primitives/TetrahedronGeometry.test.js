import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { TetrahedronGeometry } from "@/geometry/primitives/TetrahedronGeometry.js";

describe("TetrahedronGeometry vs THREE.TetrahedronGeometry", () => {
	it("default — vertex count matches", () => {
		expect(new TetrahedronGeometry().getAttribute("position").count).toBe(
			new THREE.TetrahedronGeometry().getAttribute("position").count,
		);
	});

	it("default — has index or non-indexed positions", () => {
		const g = new TetrahedronGeometry();
		// easel may use non-indexed flat geometry; vertex count > 0 either way
		const posCount = g.getAttribute("position").count;
		expect(posCount).toBeGreaterThan(0);
	});

	it("default — normals are unit length", () => {
		const normals = new TetrahedronGeometry().getAttribute("normal").array;
		for (let i = 0; i < Math.min(normals.length, 30); i += 3) {
			const len = Math.sqrt(
				normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2,
			);
			expect(len).toBeCloseTo(1, 3);
		}
	});

	it("default — bounding radius ~1", () => {
		const pos = new TetrahedronGeometry().getAttribute("position").array;
		let maxR = 0;
		for (let i = 0; i < pos.length; i += 3) {
			const r = Math.sqrt(pos[i] ** 2 + pos[i + 1] ** 2 + pos[i + 2] ** 2);
			if (r > maxR) maxR = r;
		}
		expect(maxR).toBeCloseTo(1, 3);
	});

	it("detail=1 — vertex count matches THREE", () => {
		expect(new TetrahedronGeometry(1, 1).getAttribute("position").count).toBe(
			new THREE.TetrahedronGeometry(1, 1).getAttribute("position").count,
		);
	});

	it("detail=1 — has positions", () => {
		const g = new TetrahedronGeometry(1, 1);
		expect(g.getAttribute("position").count).toBeGreaterThan(0);
	});
});
