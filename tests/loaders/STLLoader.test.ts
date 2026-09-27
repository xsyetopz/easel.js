import { describe, expect, it } from "bun:test";
import { STLLoader } from "@/loaders/STLLoader.js";

const ascii = `solid triangle
facet normal 0 0 1
 outer loop
  vertex 0 0 0
  vertex 1 0 0
  vertex 0 1 0
 endloop
endfacet
endsolid triangle`;

describe("STLLoader", () => {
  it("parses ASCII STL facets", () => {
    const geometry = new STLLoader().parse(ascii);
    expect(geometry.getAttribute("position")?.count).toBe(3);
    expect(geometry.getAttribute("normal")?.getZ(0)).toBeCloseTo(1);
  });

  it("parses binary STL facets", () => {
    const buffer = new ArrayBuffer(134);
    const view = new DataView(buffer);
    view.setUint32(80, 1, true);
    const values = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
    values.forEach((value, index) => {
      view.setFloat32(84 + index * 4, value, true);
    });
    const geometry = new STLLoader().parse(buffer);
    expect(geometry.getAttribute("position")?.count).toBe(3);
    expect(geometry.getAttribute("normal")?.getZ(1)).toBeCloseTo(1);
  });

  it("decodes binary STL default sRGB colors", () => {
    const buffer = new ArrayBuffer(134);
    const view = new DataView(buffer);
    view.setUint32(80, 1, true);
    view.setUint32(0, 0x434f4c4f, false);
    view.setUint8(4, 0x52);
    view.setUint8(5, 0x3d);
    view.setUint8(6, 128);
    view.setUint16(132, 0x8000, true);
    const geometry = new STLLoader().parse(buffer);
    expect(geometry.getAttribute("color")?.getX(0)).toBeCloseTo(0.2158605);
  });
});
