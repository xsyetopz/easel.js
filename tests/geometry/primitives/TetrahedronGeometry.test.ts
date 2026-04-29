import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { TetrahedronGeometry } from "@/geometry/primitives/TetrahedronGeometry.ts";
import { defined } from "../../_helpers/defined.js";
import { expectUnitNormals, maxVertexRadius } from "../../_helpers/geometry.js";

describe("TetrahedronGeometry vs THREE.TetrahedronGeometry", () => {
	it("default - vertex count matches", () => {
		expect(
			defined(new TetrahedronGeometry().getAttribute("position")).count,
		).toBe(
			defined(new THREE.TetrahedronGeometry().getAttribute("position")).count,
		);
	});

	it("default - has index or non-indexed positions", () => {
		const g = new TetrahedronGeometry();
		// easel may use non-indexed flat geometry; vertex count > 0 either way
		const posCount = defined(g.getAttribute("position")).count;
		expect(posCount).toBeGreaterThan(0);
	});

	it("default - normals are unit length", () => {
		const normals = defined(
			new TetrahedronGeometry().getAttribute("normal"),
		).array;
		expectUnitNormals(normals, 3);
	});

	it("default - bounding radius ~1", () => {
		const pos = defined(
			new TetrahedronGeometry().getAttribute("position"),
		).array;
		const maxR = maxVertexRadius(pos);
		expect(maxR).toBeCloseTo(1, 3);
	});

	it("detail=1 - vertex count matches THREE", () => {
		expect(
			defined(new TetrahedronGeometry(1, 1).getAttribute("position")).count,
		).toBe(
			defined(new THREE.TetrahedronGeometry(1, 1).getAttribute("position"))
				.count,
		);
	});

	it("detail=1 - has positions", () => {
		const g = new TetrahedronGeometry(1, 1);
		expect(defined(g.getAttribute("position")).count).toBeGreaterThan(0);
	});
});
