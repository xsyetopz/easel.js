import { describe, expect, it } from "vitest";
import { ConeGeometry } from "@/geometry/primitives/ConeGeometry.js";

describe("ConeGeometry", () => {
	it("default — has position, normal, uv, index", () => {
		const geo = new ConeGeometry();
		expect(geo.getAttribute("position")).toBeDefined();
		expect(geo.getAttribute("normal")).toBeDefined();
		expect(geo.getAttribute("uv")).toBeDefined();
		expect(geo.index).not.toBeUndefined();
	});

	it("default — vertex count > 0", () => {
		expect(new ConeGeometry().getAttribute("position").count).toBeGreaterThan(
			0,
		);
	});

	it("default — normals are unit length", () => {
		const normals = new ConeGeometry().getAttribute("normal").array;
		for (let i = 0; i < Math.min(normals.length, 30); i += 3) {
			const len = Math.sqrt(
				normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2,
			);
			expect(len).toBeCloseTo(1, 4);
		}
	});

	it("custom (1.5,3,12) — bounding box height matches", () => {
		const pos = new ConeGeometry(1.5, 3, 12).getAttribute("position").array;
		let minY = Number.POSITIVE_INFINITY;
		let maxY = Number.NEGATIVE_INFINITY;
		for (let i = 1; i < pos.length; i += 3) {
			if (pos[i] < minY) minY = pos[i];
			if (pos[i] > maxY) maxY = pos[i];
		}
		expect(maxY - minY).toBeCloseTo(3, 3);
	});

	it("apex at top (radiusTop=0)", () => {
		const pos = new ConeGeometry(1, 2, 8).getAttribute("position").array;
		const halfH = 2 / 2;
		let hasApex = false;
		for (let i = 0; i < pos.length; i += 3) {
			if (pos[i + 1] > halfH - 0.01) {
				const r = Math.sqrt(pos[i] ** 2 + pos[i + 2] ** 2);
				if (r < 0.01) hasApex = true;
			}
		}
		expect(hasApex).toBe(true);
	});

	it("type is ConeGeometry", () => {
		expect(new ConeGeometry().type).toBe("ConeGeometry");
	});
});
