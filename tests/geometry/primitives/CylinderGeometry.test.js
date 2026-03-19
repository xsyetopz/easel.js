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
