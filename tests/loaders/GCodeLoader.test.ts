import { describe, expect, it } from "bun:test";
import { GCodeLoader } from "@/loaders/GCodeLoader.js";
import { LineSegments } from "@/objects/LineSegments.js";

describe("GCodeLoader", () => {
  it("parses travel, extrusion, modal fields, and layer comments", () => {
    const loader = new GCodeLoader();
    loader.splitLayer = true;
    const group = loader.parse(`
G90
M83
G0 X0 Y0 Z0 F6000
G1 X1 Y0 E0.2 F1200
G1 X1 Y1 E0.2
;LAYER:1
G0 Z0.4
G1 X0 Y1 E0.2
`);

    expect(group.name).toBe("gcode");
    expect(group.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(group.children).toHaveLength(4);
    expect(group.userData["layers"]).toEqual([
      { index: 0, z: 0 },
      { index: 1, z: 0.4 },
    ]);
    expect(group.userData["feedRates"]).toEqual([6000, 1200]);

    const firstExtrusion = group.children[0];
    const firstTravel = group.children[1];
    expect(firstExtrusion).toBeInstanceOf(LineSegments);
    expect(firstTravel).toBeInstanceOf(LineSegments);
    if (
      !(
        firstExtrusion instanceof LineSegments &&
        firstTravel instanceof LineSegments
      )
    )
      return;
    expect(firstExtrusion.material?.name).toBe("extruded");
    expect(firstTravel.material?.name).toBe("path");
    expect(firstExtrusion.geometry?.getAttribute("position")?.count).toBe(4);
    expect(firstTravel.geometry?.getAttribute("position")?.count).toBe(2);
  });

  it("supports relative coordinates and extrusion overrides", () => {
    const group = new GCodeLoader().parse(`
G91
M83
G1 X1 Y2 Z3 E0.5
M82
G1 X1 E1
`);
    const extrusion = group.children[0];
    expect(extrusion).toBeInstanceOf(LineSegments);
    if (!(extrusion instanceof LineSegments)) return;
    const positions = extrusion.geometry?.getAttribute("position");
    expect(positions?.count).toBe(4);
    expect(Array.from(positions?.array ?? [])).toEqual([
      0, 0, 0, 1, 2, 3, 1, 2, 3, 2, 2, 3,
    ]);
  });

  it("returns empty line objects for malformed or empty input", () => {
    const group = new GCodeLoader().parse("; no movements\nG1 Xinvalid Y?\n");
    expect(group.children).toHaveLength(2);
    expect(group.children.every((child) => child instanceof LineSegments)).toBe(
      true,
    );
    expect(() => new GCodeLoader().parse(null as unknown as string)).toThrow(
      TypeError,
    );
  });

  it("classifies G0 travel and G1 cutting in toolpath mode", () => {
    const loader = new GCodeLoader();
    loader.mode = "toolpath";
    const group = loader.parse(`
G90
G0 X1 Y0
G1 X1 Y1 F300
G0 X0 Y1
G1 X0 Y0
`);
    const cut = group.children[0];
    const travel = group.children[1];
    expect(group.userData["mode"]).toBe("toolpath");
    expect(cut).toBeInstanceOf(LineSegments);
    expect(travel).toBeInstanceOf(LineSegments);
    if (!(cut instanceof LineSegments && travel instanceof LineSegments))
      return;
    expect(cut.material?.name).toBe("cut");
    expect(travel.material?.name).toBe("travel");
    expect(cut.geometry?.getAttribute("position")?.count).toBe(4);
    expect(travel.geometry?.getAttribute("position")?.count).toBe(4);
  });
});
