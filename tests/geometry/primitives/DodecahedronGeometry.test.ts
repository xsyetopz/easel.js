import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { DodecahedronGeometry } from "@/geometry/primitives/DodecahedronGeometry.js";

describe("DodecahedronGeometry vs THREE.DodecahedronGeometry", () => {
	it("default - vertex count matches", () => {
		expect(new DodecahedronGeometry().getAttribute("position").count).toBe(
			new THREE.DodecahedronGeometry().getAttribute("position").count,
		);
	});

	it("default - has positions", () => {
		expect(
			new DodecahedronGeometry().getAttribute("position").count,
		).toBeGreaterThan(0);
	});

	it("default - normals are unit length", () => {
		const normals = new DodecahedronGeometry().getAttribute("normal").array;
		for (let i = 0; i < Math.min(normals.length, 30); i += 3) {
			const len = Math.sqrt(
				normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2,
			);
			expect(len).toBeCloseTo(1, 3);
		}
	});

	it("default - bounding radius ~1", () => {
		const pos = new DodecahedronGeometry().getAttribute("position").array;
		let maxR = 0;
		for (let i = 0; i < pos.length; i += 3) {
			const r = Math.sqrt(pos[i] ** 2 + pos[i + 1] ** 2 + pos[i + 2] ** 2);
			if (r > maxR) maxR = r;
		}
		expect(maxR).toBeGreaterThan(0.5);
		expect(maxR).toBeLessThanOrEqual(2);
	});

	it("detail=1 - vertex count matches THREE", () => {
		expect(new DodecahedronGeometry(1, 1).getAttribute("position").count).toBe(
			new THREE.DodecahedronGeometry(1, 1).getAttribute("position").count,
		);
	});

	it("detail=1 - has more positions than detail=0", () => {
		const d0 = new DodecahedronGeometry(1, 0).getAttribute("position").count;
		const d1 = new DodecahedronGeometry(1, 1).getAttribute("position").count;
		expect(d1).toBeGreaterThan(d0);
	});
});

describe("DodecahedronGeometry winding order", () => {
	it("all 36 face normals point outward (detail=0)", () => {
		const geo = new DodecahedronGeometry(1, 0);
		const pos = geo.getAttribute("position").array;
		// Non-indexed: every 9 floats = 1 triangle (3 vertices × 3 components)
		const triCount = pos.length / 9;
		expect(triCount).toBe(36);

		for (let t = 0; t < triCount; t++) {
			const base = t * 9;
			const ax = pos[base];
			const ay = pos[base + 1];
			const az = pos[base + 2];
			const bx = pos[base + 3];
			const by = pos[base + 4];
			const bz = pos[base + 5];
			const cx = pos[base + 6];
			const cy = pos[base + 7];
			const cz = pos[base + 8];

			// Cross product (b-a) × (c-a)
			const abx = bx - ax;
			const aby = by - ay;
			const abz = bz - az;
			const acx = cx - ax;
			const acy = cy - ay;
			const acz = cz - az;
			const nx = aby * acz - abz * acy;
			const ny = abz * acx - abx * acz;
			const nz = abx * acy - aby * acx;

			// Centroid
			const mx = (ax + bx + cx) / 3;
			const my = (ay + by + cy) / 3;
			const mz = (az + bz + cz) / 3;

			// Outward if face normal · centroid > 0 (origin is at center)
			const dot = nx * mx + ny * my + nz * mz;
			expect(dot, `triangle ${t} face normal points inward`).toBeGreaterThan(0);
		}
	});
});
