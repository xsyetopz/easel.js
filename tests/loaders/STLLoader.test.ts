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
});
