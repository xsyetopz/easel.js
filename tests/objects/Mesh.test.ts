import { describe, expect, it } from "bun:test";
import { Node } from "@/core/Node.js";
import { Mesh } from "@/objects/Mesh.js";

describe("Mesh", () => {
	it("has type='Mesh'", () => {
		const mesh = new Mesh();
		expect(mesh.type).toBe("Mesh");
	});

	it("stores geometry and material from constructor", () => {
		const geo = { type: "Geometry" } as unknown as never;
		const mat = { type: "Material" } as unknown as never;
		const mesh = new Mesh(geo, mat);
		expect(mesh.geometry).toBe(geo);
		expect(mesh.material).toBe(mat);
	});

	it("defaults geometry and material to undefined", () => {
		const mesh = new Mesh();
		expect(mesh.geometry).toBeUndefined();
		expect(mesh.material).toBeUndefined();
	});

	it("inherits from Node", () => {
		expect(new Mesh()).toBeInstanceOf(Node);
	});

	it("clone returns a Mesh with same geometry and material", () => {
		const geo = { type: "Geometry" } as unknown as never;
		const mat = { type: "Material" } as unknown as never;
		const mesh = new Mesh(geo, mat);
		mesh.name = "myMesh";
		const c = mesh.clone();
		expect(c).toBeInstanceOf(Mesh);
		expect(c).not.toBe(mesh);
		expect(c.geometry).toBe(geo);
		expect(c.material).toBe(mat);
		expect(c.name).toBe("myMesh");
	});

	it("copy copies geometry, material, and Node properties", () => {
		const src = new Mesh(
			{ type: "Geo" } as unknown as never,
			{ type: "Mat" } as unknown as never,
		);
		src.name = "src";
		const dest = new Mesh();
		dest.copy(src);
		expect(dest.geometry).toBe(src.geometry);
		expect(dest.material).toBe(src.material);
		expect(dest.name).toBe("src");
	});
});
