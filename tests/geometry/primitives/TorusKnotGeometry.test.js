import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { TorusKnotGeometry } from "@/geometry/primitives/TorusKnotGeometry.js";

describe("TorusKnotGeometry vs THREE.TorusKnotGeometry", () => {
	it("default — vertex count matches", () => {
		expect(new TorusKnotGeometry().getAttribute("position").count).toBe(
			new THREE.TorusKnotGeometry().getAttribute("position").count,
		);
	});

	it("default — index count matches", () => {
		expect(new TorusKnotGeometry().index.length).toBe(
			new THREE.TorusKnotGeometry().getIndex().array.length,
		);
	});

	it("default — normals are unit length", () => {
		const normals = new TorusKnotGeometry().getAttribute("normal").array;
		for (let i = 0; i < Math.min(normals.length, 30); i += 3) {
			const len = Math.sqrt(
				normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2,
			);
			expect(len).toBeCloseTo(1, 3);
		}
	});

	it("custom (1.5,0.3,32,8,3,2) — vertex count matches", () => {
		expect(
			new TorusKnotGeometry(1.5, 0.3, 32, 8, 3, 2).getAttribute("position")
				.count,
		).toBe(
			new THREE.TorusKnotGeometry(1.5, 0.3, 32, 8, 3, 2).getAttribute(
				"position",
			).count,
		);
	});

	it("custom (1.5,0.3,32,8,3,2) — index count matches", () => {
		expect(new TorusKnotGeometry(1.5, 0.3, 32, 8, 3, 2).index.length).toBe(
			new THREE.TorusKnotGeometry(1.5, 0.3, 32, 8, 3, 2).getIndex().array
				.length,
		);
	});

	it("custom (1.5,0.3,32,8,3,2) — has positions and normals", () => {
		const g = new TorusKnotGeometry(1.5, 0.3, 32, 8, 3, 2);
		expect(g.getAttribute("position")).toBeDefined();
		expect(g.getAttribute("normal")).toBeDefined();
		expect(g.getAttribute("uv")).toBeDefined();
	});
});
