import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { PlaneGeometry } from "@/geometry/primitives/PlaneGeometry.js";
import { compareArrays } from "../../_helpers/three-bridge.js";

describe("PlaneGeometry vs THREE.PlaneGeometry", () => {
	it("default — vertex count matches", () => {
		expect(new PlaneGeometry().getAttribute("position").count).toBe(
			new THREE.PlaneGeometry().getAttribute("position").count,
		);
	});

	it("default — normals match", () => {
		const { pass, failures } = compareArrays(
			new PlaneGeometry().getAttribute("normal").array,
			new THREE.PlaneGeometry().getAttribute("normal").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("default — uvs match", () => {
		const { pass, failures } = compareArrays(
			new PlaneGeometry().getAttribute("uv").array,
			new THREE.PlaneGeometry().getAttribute("uv").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("default — index count matches", () => {
		expect(new PlaneGeometry().index.length).toBe(
			new THREE.PlaneGeometry().getIndex().array.length,
		);
	});

	it("custom (5,3,4,2) — vertex count matches", () => {
		expect(new PlaneGeometry(5, 3, 4, 2).getAttribute("position").count).toBe(
			new THREE.PlaneGeometry(5, 3, 4, 2).getAttribute("position").count,
		);
	});

	it("custom (5,3,4,2) — normals match", () => {
		const { pass, failures } = compareArrays(
			new PlaneGeometry(5, 3, 4, 2).getAttribute("normal").array,
			new THREE.PlaneGeometry(5, 3, 4, 2).getAttribute("normal").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("custom (5,3,4,2) — uvs match", () => {
		const { pass, failures } = compareArrays(
			new PlaneGeometry(5, 3, 4, 2).getAttribute("uv").array,
			new THREE.PlaneGeometry(5, 3, 4, 2).getAttribute("uv").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("custom (5,3,4,2) — index count matches", () => {
		expect(new PlaneGeometry(5, 3, 4, 2).index.length).toBe(
			new THREE.PlaneGeometry(5, 3, 4, 2).getIndex().array.length,
		);
	});
});
