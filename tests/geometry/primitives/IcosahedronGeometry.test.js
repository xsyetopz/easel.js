import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { IcosahedronGeometry } from "@/geometry/primitives/IcosahedronGeometry.js";

describe("IcosahedronGeometry vs THREE.IcosahedronGeometry", () => {
	it("default - vertex count matches", () => {
		expect(new IcosahedronGeometry().getAttribute("position").count).toBe(
			new THREE.IcosahedronGeometry().getAttribute("position").count,
		);
	});

	it("default - has positions", () => {
		expect(
			new IcosahedronGeometry().getAttribute("position").count,
		).toBeGreaterThan(0);
	});

	it("default - normals are unit length", () => {
		const normals = new IcosahedronGeometry().getAttribute("normal").array;
		for (let i = 0; i < Math.min(normals.length, 30); i += 3) {
			const len = Math.sqrt(
				normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2,
			);
			expect(len).toBeCloseTo(1, 3);
		}
	});

	it("default - bounding radius ~1", () => {
		const pos = new IcosahedronGeometry().getAttribute("position").array;
		let maxR = 0;
		for (let i = 0; i < pos.length; i += 3) {
			const r = Math.sqrt(pos[i] ** 2 + pos[i + 1] ** 2 + pos[i + 2] ** 2);
			if (r > maxR) maxR = r;
		}
		expect(maxR).toBeCloseTo(1, 3);
	});

	it("detail=1 - vertex count matches THREE", () => {
		expect(new IcosahedronGeometry(1, 1).getAttribute("position").count).toBe(
			new THREE.IcosahedronGeometry(1, 1).getAttribute("position").count,
		);
	});

	it("detail=1 - has more positions than detail=0", () => {
		const d0 = new IcosahedronGeometry(1, 0).getAttribute("position").count;
		const d1 = new IcosahedronGeometry(1, 1).getAttribute("position").count;
		expect(d1).toBeGreaterThan(d0);
	});
});
