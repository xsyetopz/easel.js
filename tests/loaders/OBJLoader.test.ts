import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { OBJLoader } from "@/loaders/OBJLoader.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { Mesh } from "@/objects/Mesh.js";

const MATERIAL_NAME_KEY = "materialName";
const MTLLIB_KEY = "mtllib";

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
    expect(mesh.userData[MATERIAL_NAME_KEY]).toBe("blue");
    expect(mesh.material).not.toBe(material);
    expect((mesh.material as BasicMaterial).color.hex).toBe(0x336699);
    expect(group.userData[MTLLIB_KEY]).toEqual(["scene.mtl"]);
  });
  it("parses the canonical Suzanne interchange fixture", () => {
    const source = readFileSync(
      new URL("../../fixtures/models/suzanne/suzanne.obj", import.meta.url),
      "utf8",
    );
    const group = new OBJLoader().parse(source);
    const mesh = group.children[0];

    expect(group.children).toHaveLength(1);
    expect(mesh).toBeInstanceOf(Mesh);
    if (!(mesh instanceof Mesh)) return;
    expect(mesh.name).toBe("Suzanne");
    expect(mesh.geometry?.getAttribute("position")?.count).toBe(2012);
    expect(mesh.geometry?.getAttribute("normal")?.count).toBe(2012);
    expect(mesh.geometry?.getAttribute("uv")?.count).toBe(2012);
    expect(mesh.geometry?.index).toHaveLength(11808);
    expect(mesh.userData[MATERIAL_NAME_KEY]).toBe("Suzanne");
  });
});
