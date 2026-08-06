import { describe, expect, it } from "bun:test";
import { BoxGeometry } from "@/geometry/primitives/BoxGeometry.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { Mesh } from "@/objects/Mesh.js";
import { PLYExporter } from "@/exporters/PLYExporter.js";

describe("PLYExporter", () => {
  it("serializes transformed vertices, normals, colors, and faces as ASCII", () => {
    const geometry = new BoxGeometry(1, 1, 1);
    geometry.setColors(
      new Array((geometry.getAttribute("position")?.count ?? 0) * 3).fill(1),
    );
    const mesh = new Mesh(geometry, new BasicMaterial());
    mesh.position.x = 2;
    const text = new PLYExporter().parse(mesh);
    expect(typeof text).toBe("string");
    if (typeof text !== "string") return;
    expect(text).toContain("format ascii 1.0");
    expect(text).toContain("property float nx");
    expect(text).toContain("property uchar red");
    expect(text).toContain("element face 12");
    expect(text).toContain("1.5 -0.5 0.5");
  });

  it("supports binary little-endian output", () => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial());
    const data = new PLYExporter().parseBinary(mesh);
    const header = new TextDecoder().decode(data.slice(0, 512));
    expect(header).toContain("format binary_little_endian 1.0");
    expect(header).toContain("end_header");
    expect(data.length).toBeGreaterThan(header.indexOf("end_header") + 10);
  });
});
