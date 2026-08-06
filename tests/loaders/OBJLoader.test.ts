import { describe, expect, it } from "bun:test";
import { OBJLoader } from "@/loaders/OBJLoader.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { Mesh } from "@/objects/Mesh.js";

describe("OBJLoader", () => {
  it("parses indexed triangles, UVs, normals, and negative indices", () => {
    const group = new OBJLoader().parse(`
      o Triangle
      v 0 0 0
      v 1 0 0
      v 0 1 0
      vt 0 0
      vt 1 0
      vt 0 1
      vn 0 0 1
      f 1/1/1 2/2/1 3/3/1
      g Second
      f -3/-3/-1 -2/-2/-1 -1/-1/-1
    `);

    expect(group.children).toHaveLength(2);
    const first = group.children[0];
    expect(first).toBeInstanceOf(Mesh);
    const geometry = (first as Mesh).geometry;
    expect(geometry).toBeDefined();
    if (geometry === undefined) return;
    expect(geometry.index).toHaveLength(3);
    expect(geometry.getAttribute("position")?.count).toBe(3);
    expect(geometry.getAttribute("uv")?.count).toBe(3);
    expect(geometry.getAttribute("normal")?.count).toBe(3);
  });

  it("computes normals when OBJ omits them", () => {
    const group = new OBJLoader().parse("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3");
    const mesh = group.children[0];
    expect(mesh).toBeInstanceOf(Mesh);
    const geometry = (mesh as Mesh).geometry;
    expect(geometry?.getAttribute("normal")?.getZ(0)).toBeCloseTo(1);
  });

  it("preserves usemtl assignments through a supplied CPU material table", () => {
    const material = new BasicMaterial({ color: 0x336699, name: "blue" });
    const group = new OBJLoader().parse(
      "mtllib scene.mtl\nusemtl blue\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3",
      { materials: { blue: material } },
    );
    const mesh = group.children[0] as Mesh;
    expect(mesh.userData["materialName"]).toBe("blue");
    expect(mesh.material).not.toBe(material);
    expect((mesh.material as BasicMaterial).color.hex).toBe(0x336699);
    expect(group.userData["mtllib"]).toEqual(["scene.mtl"]);
  });
});
