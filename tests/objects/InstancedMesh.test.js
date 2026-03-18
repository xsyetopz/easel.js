import { describe, expect, it } from "vitest";
import { Color } from "@/math/Color.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { InstancedMesh } from "@/objects/InstancedMesh.js";

describe("InstancedMesh", () => {
	it("has type='InstancedMesh'", () => {
		expect(new InstancedMesh(null, null, 1).type).toBe("InstancedMesh");
	});

	it("count getter returns constructor count", () => {
		const mesh = new InstancedMesh(null, null, 5);
		expect(mesh.count).toBe(5);
	});

	it("instanceMatrix is a Float32Array of length count*16", () => {
		const mesh = new InstancedMesh(null, null, 3);
		expect(mesh.instanceMatrix).toBeInstanceOf(Float32Array);
		expect(mesh.instanceMatrix.length).toBe(48);
	});

	it("each instance matrix is identity by default", () => {
		const mesh = new InstancedMesh(null, null, 2);
		const m = new Matrix4();
		mesh.getMatrixAt(0, m);
		const identity = new Matrix4();
		for (let i = 0; i < 16; i++) {
			expect(m.elements[i]).toBeCloseTo(identity.elements[i]);
		}
	});

	it("setMatrixAt/getMatrixAt round-trip", () => {
		const mesh = new InstancedMesh(null, null, 3);
		const m = new Matrix4();
		m.elements[12] = 7;
		m.elements[13] = 8;
		m.elements[14] = 9;
		mesh.setMatrixAt(1, m);
		const out = new Matrix4();
		mesh.getMatrixAt(1, out);
		expect(out.elements[12]).toBeCloseTo(7);
		expect(out.elements[13]).toBeCloseTo(8);
		expect(out.elements[14]).toBeCloseTo(9);
	});

	it("instanceColor is null before setColorAt", () => {
		const mesh = new InstancedMesh(null, null, 2);
		expect(mesh.instanceColor).toBeNull();
	});

	it("setColorAt lazily allocates instanceColor and round-trips", () => {
		const mesh = new InstancedMesh(null, null, 2);
		const color = new Color(1, 0.5, 0.25);
		mesh.setColorAt(0, color);
		expect(mesh.instanceColor).toBeInstanceOf(Float32Array);
		const out = new Color();
		mesh.getColorAt(0, out);
		expect(out.r).toBeCloseTo(1);
		expect(out.g).toBeCloseTo(0.5);
		expect(out.b).toBeCloseTo(0.25);
	});
});
