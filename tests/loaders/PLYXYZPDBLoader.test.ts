import { describe, expect, test } from "bun:test";
import { PDBLoader } from "@/loaders/PDBLoader.ts";
import { PLYLoader } from "@/loaders/PLYLoader.ts";
import { XYZLoader } from "@/loaders/XYZLoader.ts";

describe("PLYLoader", () => {
  test("parses ASCII vertices, normals, colors, and polygon faces", () => {
    const data = [
      "ply",
      "format ascii 1.0",
      "element vertex 4",
      "property float x",
      "property float y",
      "property float z",
      "property float nx",
      "property float ny",
      "property float nz",
      "property uchar red",
      "property uchar green",
      "property uchar blue",
      "element face 1",
      "property list uchar int vertex_indices",
      "end_header",
      "0 0 0 0 0 1 255 0 0",
      "1 0 0 0 0 1 0 255 0",
      "1 1 0 0 0 1 0 0 255",
      "0 1 0 0 0 1 255 255 255",
      "4 0 1 2 3",
    ].join("\n");
    const geometry = new PLYLoader().parse(data);
    expect(geometry.getAttribute("position")?.count).toBe(4);
    expect(geometry.getAttribute("normal")?.getZ(0)).toBe(1);
    expect(geometry.getAttribute("color")?.getX(0)).toBe(1);
    expect(Array.from(geometry.index ?? [])).toEqual([0, 1, 2, 0, 2, 3]);
  });

  test("applies source property mappings", () => {
    const data = [
      "ply",
      "format ascii 1.0",
      "element vertex 1",
      "property float px",
      "property float py",
      "property float pz",
      "end_header",
      "2 3 4",
    ].join("\n");
    const geometry = new PLYLoader()
      .setPropertyNameMapping({ px: "x", py: "y", pz: "z" })
      .parse(data);
    expect(Array.from(geometry.getAttribute("position")?.array ?? [])).toEqual([
      2, 3, 4,
    ]);
  });

  test("parses binary little-endian vertices and faces", () => {
    const header = [
      "ply",
      "format binary_little_endian 1.0",
      "element vertex 3",
      "property float x",
      "property float y",
      "property float z",
      "element face 1",
      "property list uchar int vertex_indices",
      "end_header",
      "",
    ].join("\n");
    const body = new ArrayBuffer(3 * 12 + 1 + 3 * 4);
    const view = new DataView(body);
    view.setFloat32(0, 0, true);
    view.setFloat32(4, 0, true);
    view.setFloat32(8, 0, true);
    view.setFloat32(12, 1, true);
    view.setFloat32(16, 0, true);
    view.setFloat32(20, 0, true);
    view.setFloat32(24, 0, true);
    view.setFloat32(28, 1, true);
    view.setFloat32(32, 0, true);
    view.setUint8(36, 3);
    view.setInt32(37, 0, true);
    view.setInt32(41, 1, true);
    view.setInt32(45, 2, true);
    const headerBytes = new TextEncoder().encode(header);
    const bytes = new Uint8Array(headerBytes.byteLength + body.byteLength);
    bytes.set(headerBytes);
    bytes.set(new Uint8Array(body), headerBytes.byteLength);
    const geometry = new PLYLoader().parse(bytes.buffer);
    expect(geometry.getAttribute("position")?.count).toBe(3);
    expect(Array.from(geometry.index ?? [])).toEqual([0, 1, 2]);
  });
});

describe("XYZLoader", () => {
  test("parses XYZ and XYZRGB rows while skipping comments", () => {
    const geometry = new XYZLoader().parse(
      "# cloud\n0 1 2\n1 2 3 255 128 0\ninvalid",
    );
    expect(geometry.getAttribute("position")?.count).toBe(2);
    expect(geometry.getAttribute("color")?.getX(0)).toBe(1);
    expect(geometry.getAttribute("color")?.getY(0)).toBeCloseTo(128 / 255);
  });
});

describe("PDBLoader", () => {
  test("parses atoms and unique CONECT bonds", () => {
    const pdb = [
      "ATOM      1  C   MOL A   1       0.000   0.000   0.000                      C  ",
      "ATOM      2  O   MOL A   1       1.200   0.000   0.000                      O  ",
      "CONECT    1    2",
      "CONECT    2    1",
    ].join("\n");
    const result = new PDBLoader().parse(pdb);
    expect(result.json.atoms).toHaveLength(2);
    expect(result.geometryAtoms.getAttribute("position")?.count).toBe(2);
    expect(result.geometryBonds.getAttribute("position")?.count).toBe(2);
    expect(result.geometryAtoms.getAttribute("color")?.getX(1)).toBe(1);
  });
});
