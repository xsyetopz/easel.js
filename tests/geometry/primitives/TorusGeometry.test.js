import { describe, expect, it } from "vitest";
import { TorusGeometry } from "../../../src/geometry/primitives/TorusGeometry.js";

describe("TorusGeometry", () => {
	it("generates correct vertex count", () => {
		const geo = new TorusGeometry(1, 0.4, 8, 16);
		const pos = geo.getAttribute("position");
		expect(pos.array.length / pos.itemSize).toBe((8 + 1) * (16 + 1));
	});

	it("ring lies in XZ plane (THREE.js convention)", () => {
		const geo = new TorusGeometry(1, 0.4, 8, 16);
		const pos = geo.getAttribute("position");
		// First vertex (u=0, v=0): should be at (radius+tube, 0, 0)
		expect(pos.array[0]).toBeCloseTo(1.4, 5);
		expect(pos.array[1]).toBeCloseTo(0, 5);
		expect(pos.array[2]).toBeCloseTo(0, 5);
	});

	it("normals point outward", () => {
		const geo = new TorusGeometry(1, 0.4, 8, 16);
		const nrm = geo.getAttribute("normal");
		// First normal (u=0, v=0): should point in +X
		expect(nrm.array[0]).toBeCloseTo(1, 5);
		expect(nrm.array[1]).toBeCloseTo(0, 5);
		expect(nrm.array[2]).toBeCloseTo(0, 5);
	});

	it("has index buffer", () => {
		const geo = new TorusGeometry(1, 0.4, 8, 16);
		expect(geo.index).toBeDefined();
		expect(geo.index.length).toBe(8 * 16 * 6);
	});
});
