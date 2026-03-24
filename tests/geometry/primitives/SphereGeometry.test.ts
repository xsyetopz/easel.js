import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { SphereGeometry } from "@/geometry/primitives/SphereGeometry.js";

describe("SphereGeometry vs THREE.SphereGeometry", () => {
	it("default - vertex count matches", () => {
		expect(new SphereGeometry().getAttribute("position").count).toBe(
			new THREE.SphereGeometry().getAttribute("position").count,
		);
	});

	it("default - index count matches", () => {
		expect(new SphereGeometry().index.length).toBe(
			new THREE.SphereGeometry().getIndex().array.length,
		);
	});

	it("default - bounding box matches", () => {
		const e = new SphereGeometry();
		const pos = e.getAttribute("position").array;
		let maxR = 0;
		for (let i = 0; i < pos.length; i += 3) {
			const r = Math.sqrt(pos[i] ** 2 + pos[i + 1] ** 2 + pos[i + 2] ** 2);
			if (r > maxR) maxR = r;
		}
		expect(maxR).toBeCloseTo(1, 3);
	});

	it("custom (2,16,8) - vertex count matches", () => {
		expect(new SphereGeometry(2, 16, 8).getAttribute("position").count).toBe(
			new THREE.SphereGeometry(2, 16, 8).getAttribute("position").count,
		);
	});

	it("custom (2,16,8) - index count matches", () => {
		expect(new SphereGeometry(2, 16, 8).index.length).toBe(
			new THREE.SphereGeometry(2, 16, 8).getIndex().array.length,
		);
	});

	it("custom (2,16,8) - radius 2 bounding box", () => {
		const e = new SphereGeometry(2, 16, 8);
		const pos = e.getAttribute("position").array;
		let maxR = 0;
		for (let i = 0; i < pos.length; i += 3) {
			const r = Math.sqrt(pos[i] ** 2 + pos[i + 1] ** 2 + pos[i + 2] ** 2);
			if (r > maxR) maxR = r;
		}
		expect(maxR).toBeCloseTo(2, 3);
	});

	it("default - normals are unit length", () => {
		const e = new SphereGeometry();
		const normals = e.getAttribute("normal").array;
		for (let i = 0; i < Math.min(normals.length, 30); i += 3) {
			const len = Math.sqrt(
				normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2,
			);
			expect(len).toBeCloseTo(1, 4);
		}
	});
});
