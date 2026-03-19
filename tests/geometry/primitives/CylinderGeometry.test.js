import { describe, expect, it } from "vitest";
import { CylinderGeometry } from "@/geometry/primitives/CylinderGeometry.js";

describe("CylinderGeometry", () => {
	it("default - has position, normal, uv, index", () => {
		const geo = new CylinderGeometry();
		expect(geo.getAttribute("position")).toBeDefined();
		expect(geo.getAttribute("normal")).toBeDefined();
		expect(geo.getAttribute("uv")).toBeDefined();
		expect(geo.index).not.toBeUndefined();
	});

	it("default - vertex count > 0", () => {
		const geo = new CylinderGeometry();
		expect(geo.getAttribute("position").count).toBeGreaterThan(0);
	});

	it("default - normals are unit length", () => {
		const normals = new CylinderGeometry().getAttribute("normal").array;
		for (let i = 0; i < Math.min(normals.length, 30); i += 3) {
			const len = Math.sqrt(
				normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2,
			);
			expect(len).toBeCloseTo(1, 4);
		}
	});

	it("custom (1,0.5,3,16,2) - bounding box height matches", () => {
		const pos = new CylinderGeometry(1, 0.5, 3, 16, 2).getAttribute(
			"position",
		).array;
		let minY = Number.POSITIVE_INFINITY;
		let maxY = Number.NEGATIVE_INFINITY;
		for (let i = 1; i < pos.length; i += 3) {
			if (pos[i] < minY) minY = pos[i];
			if (pos[i] > maxY) maxY = pos[i];
		}
		expect(maxY - minY).toBeCloseTo(3, 3);
	});

	it("custom (1,0.5,3,16,2) - radii match constructor args", () => {
		// CylinderGeometry(radiusTop=1, radiusBottom=0.5, ...)
		const pos = new CylinderGeometry(1, 0.5, 3, 16, 2).getAttribute(
			"position",
		).array;
		let maxRadiusTop = 0;
		let maxRadiusBot = 0;
		const halfH = 3 / 2;
		for (let i = 0; i < pos.length; i += 3) {
			const r = Math.sqrt(pos[i] ** 2 + pos[i + 2] ** 2);
			if (pos[i + 1] > halfH - 0.1) maxRadiusTop = Math.max(maxRadiusTop, r);
			if (pos[i + 1] < -halfH + 0.1) {
				maxRadiusBot = Math.max(maxRadiusBot, r);
			}
		}
		expect(maxRadiusTop).toBeCloseTo(1, 1);
		expect(maxRadiusBot).toBeCloseTo(0.5, 1);
	});

	it("more segments → more vertices", () => {
		const lo = new CylinderGeometry(1, 1, 1, 8, 1).getAttribute(
			"position",
		).count;
		const hi = new CylinderGeometry(1, 1, 1, 16, 1).getAttribute(
			"position",
		).count;
		expect(hi).toBeGreaterThan(lo);
	});

	it("type is CylinderGeometry", () => {
		expect(new CylinderGeometry().type).toBe("CylinderGeometry");
	});
});

/**
 * Computes cross product of (b-a) x (c-a).
 *
 * @param {Float32Array} pos
 * @param {number} ai
 * @param {number} bi
 * @param {number} ci
 * @returns {{ nx: number, ny: number, nz: number }}
 */
function faceNormal(pos, ai, bi, ci) {
	const ax = pos[ai * 3];
	const ay = pos[ai * 3 + 1];
	const az = pos[ai * 3 + 2];
	const bx = pos[bi * 3];
	const by = pos[bi * 3 + 1];
	const bz = pos[bi * 3 + 2];
	const cx = pos[ci * 3];
	const cy = pos[ci * 3 + 1];
	const cz = pos[ci * 3 + 2];
	const abx = bx - ax;
	const aby = by - ay;
	const abz = bz - az;
	const acx = cx - ax;
	const acy = cy - ay;
	const acz = cz - az;
	return {
		nx: aby * acz - abz * acy,
		ny: abz * acx - abx * acz,
		nz: abx * acy - aby * acx,
	};
}

describe("CylinderGeometry cap winding", () => {
	it("top cap normals point +Y", () => {
		const geo = new CylinderGeometry(1, 1, 2, 8, 1, false);
		const pos = geo.getAttribute("position").array;
		const idx = geo.index;

		// Body: 8 cols * 1 row * 2 triangles = 16 triangles = 48 indices
		// Top cap starts at 48
		const bodyIdxCount = 8 * 1 * 2 * 3;
		for (let f = 0; f < 8; f++) {
			const off = bodyIdxCount + f * 3;
			const { ny } = faceNormal(pos, idx[off], idx[off + 1], idx[off + 2]);
			expect(ny).toBeGreaterThan(0);
		}
	});

	it("bottom cap normals point -Y", () => {
		const geo = new CylinderGeometry(1, 1, 2, 8, 1, false);
		const pos = geo.getAttribute("position").array;
		const idx = geo.index;

		// Body: 48 indices, top cap: 8*3=24, bottom cap starts at 72
		const bodyIdxCount = 8 * 1 * 2 * 3;
		const topCapIdxCount = 8 * 3;
		const bottomStart = bodyIdxCount + topCapIdxCount;
		for (let f = 0; f < 8; f++) {
			const off = bottomStart + f * 3;
			const { ny } = faceNormal(pos, idx[off], idx[off + 1], idx[off + 2]);
			expect(ny).toBeLessThan(0);
		}
	});
});
