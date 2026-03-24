import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { RingGeometry } from "@/geometry/primitives/RingGeometry.js";
import { compareArrays } from "../../_helpers/three-bridge.js";

function cmp(e, t, key, eps = 1e-4) {
	const ea = key === "index" ? e.index : e.getAttribute(key).array;
	const ta = key === "index" ? t.getIndex().array : t.getAttribute(key).array;
	return compareArrays(ea, ta, eps);
}

describe("RingGeometry vs THREE.RingGeometry", () => {
	it("default - positions match", () => {
		const { pass, failures } = cmp(
			new RingGeometry(),
			new THREE.RingGeometry(),
			"position",
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("default - normals match", () => {
		const { pass, failures } = cmp(
			new RingGeometry(),
			new THREE.RingGeometry(),
			"normal",
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("default - uvs match", () => {
		const { pass, failures } = cmp(
			new RingGeometry(),
			new THREE.RingGeometry(),
			"uv",
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("default - index count matches", () => {
		expect(new RingGeometry().index.length).toBe(
			new THREE.RingGeometry().getIndex().array.length,
		);
	});

	it("custom (0.5,2,16,2) - positions match", () => {
		const { pass, failures } = cmp(
			new RingGeometry(0.5, 2, 16, 2),
			new THREE.RingGeometry(0.5, 2, 16, 2),
			"position",
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("custom (0.5,2,16,2) - normals match", () => {
		const { pass, failures } = cmp(
			new RingGeometry(0.5, 2, 16, 2),
			new THREE.RingGeometry(0.5, 2, 16, 2),
			"normal",
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("custom (0.5,2,16,2) - uvs match", () => {
		const { pass, failures } = cmp(
			new RingGeometry(0.5, 2, 16, 2),
			new THREE.RingGeometry(0.5, 2, 16, 2),
			"uv",
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("custom (0.5,2,16,2) - index count matches", () => {
		expect(new RingGeometry(0.5, 2, 16, 2).index.length).toBe(
			new THREE.RingGeometry(0.5, 2, 16, 2).getIndex().array.length,
		);
	});
});
