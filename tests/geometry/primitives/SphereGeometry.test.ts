import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { SphereGeometry } from "@/geometry/primitives/SphereGeometry.js";
import { defined } from "../../_helpers/defined.js";
import { expectUnitNormals, maxVertexRadius } from "../../_helpers/geometry.js";

describe("SphereGeometry vs THREE.SphereGeometry", () => {
	it("default - vertex count matches", () => {
		expect(defined(new SphereGeometry().getAttribute("position")).count).toBe(
			defined(new THREE.SphereGeometry().getAttribute("position")).count,
		);
	});

	it("default - index count matches", () => {
		expect(defined(new SphereGeometry().index).length).toBe(
			defined(new THREE.SphereGeometry().getIndex()).array.length,
		);
	});

	it("default - bounding box matches", () => {
		const e = new SphereGeometry();
		const pos = defined(e.getAttribute("position")).array;
		const maxR = maxVertexRadius(pos);
		expect(maxR).toBeCloseTo(1, 3);
	});

	it("custom (2,16,8) - vertex count matches", () => {
		expect(
			defined(new SphereGeometry(2, 16, 8).getAttribute("position")).count,
		).toBe(
			defined(new THREE.SphereGeometry(2, 16, 8).getAttribute("position"))
				.count,
		);
	});

	it("custom (2,16,8) - index count matches", () => {
		expect(defined(new SphereGeometry(2, 16, 8).index).length).toBe(
			defined(new THREE.SphereGeometry(2, 16, 8).getIndex()).array.length,
		);
	});

	it("custom (2,16,8) - radius 2 bounding box", () => {
		const e = new SphereGeometry(2, 16, 8);
		const pos = defined(e.getAttribute("position")).array;
		const maxR = maxVertexRadius(pos);
		expect(maxR).toBeCloseTo(2, 3);
	});

	it("default - normals are unit length", () => {
		const e = new SphereGeometry();
		const normals = defined(e.getAttribute("normal")).array;
		expectUnitNormals(normals, 4);
	});
});
