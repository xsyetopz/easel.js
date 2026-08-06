import { describe, expect, it } from "bun:test";
import { BoxGeometry } from "@/geometry/primitives/BoxGeometry.js";
import { OBJExporter } from "@/exporters/OBJExporter.js";
import { MTLExporter } from "@/exporters/MTLExporter.js";
import { STLExporter } from "@/exporters/STLExporter.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { Mesh } from "@/objects/Mesh.js";
import { Texture } from "@/textures/Texture.js";

describe("OBJExporter and STLExporter", () => {
  it("serializes indexed mesh positions and faces to OBJ", () => {
    const material = new BasicMaterial({
      name: "BoxMaterial",
      color: 0x336699,
    });
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
    mesh.name = "Box";
    mesh.geometry?.setColors(new Array(24 * 3).fill(1));
    const text = new OBJExporter().parse(mesh, { materialLibrary: "box.mtl" });
    expect(text).toContain("mtllib box.mtl");
    expect(text).toContain("o Box");
    expect(text).toContain("usemtl BoxMaterial");
    expect(text).toContain("# easel-material-color 336699");
    expect(text).toContain("v -0.5 -0.5 0.5 1 1 1");
    expect((text.match(/^v /gm) ?? []).length).toBe(24);
    expect((text.match(/^f /gm) ?? []).length).toBe(12);
  });

  it("serializes every indexed triangle to ASCII STL", () => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial());
    const text = new STLExporter().parse(mesh, "Box");
    expect(text.startsWith("solid Box\n")).toBe(true);
    expect((text.match(/^ facet normal /gm) ?? []).length).toBe(12);
    expect(text.endsWith("endsolid Box\n")).toBe(true);
  });

  it("serializes CPU material color, opacity, and texture paths to MTL", () => {
    const material = new BasicMaterial({
      name: "BoxMaterial",
      color: 0x336699,
      opacity: 2,
      transparent: true,
    });
    const texture = new Texture();
    texture.name = "albedo.png";
    material.map = texture;
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
    const text = new MTLExporter().parse(mesh);
    expect(text).toContain("newmtl BoxMaterial");
    expect(text).toContain("Kd 0.2 0.4 0.6");
    expect(text).toContain("d 0.75");
    expect(text).toContain("illum 2");
    expect(text).toContain("map_Kd albedo.png");
  });
});
