import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { TorusGeometry } from "@/geometry/primitives/TorusGeometry.js";

describe("TorusGeometry vs THREE.TorusGeometry", () => {
	it("default — vertex count matches", () => {
		expect(new TorusGeometry().getAttribute("position").count).toBe(
			new THREE.TorusGeometry().getAttribute("position").count,
		);
	});

	it("default — index count matches", () => {
		expect(new TorusGeometry().index.length).toBe(
			new THREE.TorusGeometry().getIndex().array.length,
		);
	});

	it("default — normals are unit length", () => {
		const normals = new TorusGeometry().getAttribute("normal").array;
		for (let i = 0; i < Math.min(normals.length, 30); i += 3) {
			const len = Math.sqrt(
				normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2,
			);
			expect(len).toBeCloseTo(1, 4);
		}
	});

	it("custom (2,0.5,8,24) — vertex count matches", () => {
		expect(
			new TorusGeometry(2, 0.5, 8, 24).getAttribute("position").count,
		).toBe(
			new THREE.TorusGeometry(2, 0.5, 8, 24).getAttribute("position").count,
		);
	});

	it("custom (2,0.5,8,24) — index count matches", () => {
		expect(new TorusGeometry(2, 0.5, 8, 24).index.length).toBe(
			new THREE.TorusGeometry(2, 0.5, 8, 24).getIndex().array.length,
		);
	});

	it("custom (2,0.5,8,24) — bounding radius ~2.5", () => {
		const pos = new TorusGeometry(2, 0.5, 8, 24).getAttribute("position").array;
		let maxR = 0;
		for (let i = 0; i < pos.length; i += 3) {
			const r = Math.sqrt(pos[i] ** 2 + pos[i + 1] ** 2 + pos[i + 2] ** 2);
			if (r > maxR) maxR = r;
		}
		expect(maxR).toBeCloseTo(2.5, 2);
	});
});
