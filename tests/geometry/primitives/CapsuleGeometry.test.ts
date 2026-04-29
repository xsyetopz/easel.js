import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CapsuleGeometry } from "@/geometry/primitives/CapsuleGeometry.js";
import { defined } from "../../_helpers/defined.js";
import { expectUnitNormals } from "../../_helpers/geometry.js";

describe("CapsuleGeometry vs THREE.CapsuleGeometry", () => {
	it("default - vertex count matches", () => {
		expect(defined(new CapsuleGeometry().getAttribute("position")).count).toBe(
			defined(new THREE.CapsuleGeometry().getAttribute("position")).count,
		);
	});

	it("default - index count matches", () => {
		expect(defined(new CapsuleGeometry().index).length).toBe(
			defined(new THREE.CapsuleGeometry().getIndex()).array.length,
		);
	});

	it("default - normals are unit length", () => {
		const normals = defined(new CapsuleGeometry().getAttribute("normal")).array;
		expectUnitNormals(normals, 4);
	});

	it("custom (0.5,2,4,8) - vertex count matches", () => {
		expect(
			defined(new CapsuleGeometry(0.5, 2, 4, 8).getAttribute("position")).count,
		).toBe(
			defined(new THREE.CapsuleGeometry(0.5, 2, 4, 8).getAttribute("position"))
				.count,
		);
	});

	it("custom (0.5,2,4,8) - index count matches", () => {
		expect(defined(new CapsuleGeometry(0.5, 2, 4, 8).index).length).toBe(
			defined(new THREE.CapsuleGeometry(0.5, 2, 4, 8).getIndex()).array.length,
		);
	});

	it("custom (0.5,2,4,8) - bounding box height includes caps", () => {
		// radius=0.5, length=2 → total height = length + 2*radius = 3
		const pos = defined(
			new CapsuleGeometry(0.5, 2, 4, 8).getAttribute("position"),
		).array;
		let minY = Number.POSITIVE_INFINITY;
		let maxY = Number.NEGATIVE_INFINITY;
		for (let i = 1; i < pos.length; i += 3) {
			if (pos[i] < minY) minY = pos[i];
			if (pos[i] > maxY) maxY = pos[i];
		}
		expect(maxY - minY).toBeCloseTo(3, 3);
	});
});
