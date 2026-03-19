import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { PlaneGeometry } from "@/geometry/primitives/PlaneGeometry.js";
import { compareArrays } from "../../_helpers/three-bridge.js";

describe("PlaneGeometry vs THREE.PlaneGeometry", () => {
	it("default - vertex count matches", () => {
		expect(new PlaneGeometry().getAttribute("position").count).toBe(
			new THREE.PlaneGeometry().getAttribute("position").count,
		);
	});

	it("default - normals match", () => {
		const { pass, failures } = compareArrays(
			new PlaneGeometry().getAttribute("normal").array,
			new THREE.PlaneGeometry().getAttribute("normal").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("default - uvs match", () => {
		const { pass, failures } = compareArrays(
			new PlaneGeometry().getAttribute("uv").array,
			new THREE.PlaneGeometry().getAttribute("uv").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("default - index count matches", () => {
		expect(new PlaneGeometry().index.length).toBe(
			new THREE.PlaneGeometry().getIndex().array.length,
		);
	});

	it("custom (5,3,4,2) - vertex count matches", () => {
		expect(new PlaneGeometry(5, 3, 4, 2).getAttribute("position").count).toBe(
			new THREE.PlaneGeometry(5, 3, 4, 2).getAttribute("position").count,
		);
	});

	it("custom (5,3,4,2) - normals match", () => {
		const { pass, failures } = compareArrays(
			new PlaneGeometry(5, 3, 4, 2).getAttribute("normal").array,
			new THREE.PlaneGeometry(5, 3, 4, 2).getAttribute("normal").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("custom (5,3,4,2) - uvs match", () => {
		const { pass, failures } = compareArrays(
			new PlaneGeometry(5, 3, 4, 2).getAttribute("uv").array,
			new THREE.PlaneGeometry(5, 3, 4, 2).getAttribute("uv").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("custom (5,3,4,2) - index count matches", () => {
		expect(new PlaneGeometry(5, 3, 4, 2).index.length).toBe(
			new THREE.PlaneGeometry(5, 3, 4, 2).getIndex().array.length,
		);
	});
});

describe("PlaneGeometry winding order", () => {
	it("face normals point +Z (CCW from +Z)", () => {
		const geo = new PlaneGeometry(2, 2, 2, 2);
		const pos = geo.getAttribute("position").array;
		const idx = geo.index;

		for (let t = 0; t < idx.length / 3; t++) {
			const ai = idx[t * 3];
			const bi = idx[t * 3 + 1];
			const ci = idx[t * 3 + 2];

			const abx = pos[bi * 3] - pos[ai * 3];
			const aby = pos[bi * 3 + 1] - pos[ai * 3 + 1];
			const acx = pos[ci * 3] - pos[ai * 3];
			const acy = pos[ci * 3 + 1] - pos[ai * 3 + 1];

			// Z component of cross product (XY plane, z=0)
			const crossZ = abx * acy - aby * acx;
			expect(crossZ).toBeGreaterThan(0);
		}
	});
});
