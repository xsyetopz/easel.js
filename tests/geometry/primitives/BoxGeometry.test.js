import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BoxGeometry } from "@/geometry/primitives/BoxGeometry.js";
import { compareArrays } from "../../_helpers/three-bridge.js";

describe("BoxGeometry vs THREE.BoxGeometry", () => {
	it("default constructor — positions match", () => {
		const e = new BoxGeometry();
		const t = new THREE.BoxGeometry();
		const { pass, failures } = compareArrays(
			e.getAttribute("position").array,
			t.getAttribute("position").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("default constructor — normals match", () => {
		const e = new BoxGeometry();
		const t = new THREE.BoxGeometry();
		const { pass, failures } = compareArrays(
			e.getAttribute("normal").array,
			t.getAttribute("normal").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("default constructor — uvs match", () => {
		const e = new BoxGeometry();
		const t = new THREE.BoxGeometry();
		const { pass, failures } = compareArrays(
			e.getAttribute("uv").array,
			t.getAttribute("uv").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("default constructor — index count matches", () => {
		const e = new BoxGeometry();
		const t = new THREE.BoxGeometry();
		expect(e.index.length).toBe(t.getIndex().array.length);
	});

	it("custom dimensions + segments — positions match", () => {
		const e = new BoxGeometry(2, 3, 4, 2, 3, 4);
		const t = new THREE.BoxGeometry(2, 3, 4, 2, 3, 4);
		const { pass, failures } = compareArrays(
			e.getAttribute("position").array,
			t.getAttribute("position").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("custom dimensions + segments — normals match", () => {
		const e = new BoxGeometry(2, 3, 4, 2, 3, 4);
		const t = new THREE.BoxGeometry(2, 3, 4, 2, 3, 4);
		const { pass, failures } = compareArrays(
			e.getAttribute("normal").array,
			t.getAttribute("normal").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("custom dimensions + segments — uvs match", () => {
		const e = new BoxGeometry(2, 3, 4, 2, 3, 4);
		const t = new THREE.BoxGeometry(2, 3, 4, 2, 3, 4);
		const { pass, failures } = compareArrays(
			e.getAttribute("uv").array,
			t.getAttribute("uv").array,
			1e-4,
		);
		expect(pass, failures?.join(", ")).toBe(true);
	});

	it("custom dimensions + segments — index count matches", () => {
		const e = new BoxGeometry(2, 3, 4, 2, 3, 4);
		const t = new THREE.BoxGeometry(2, 3, 4, 2, 3, 4);
		expect(e.index.length).toBe(t.getIndex().array.length);
	});
});
