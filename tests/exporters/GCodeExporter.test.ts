import { describe, expect, it } from "bun:test";
import { BoxGeometry } from "@/geometry/primitives/BoxGeometry.js";
import { GCodeExporter } from "@/exporters/GCodeExporter.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { Mesh } from "@/objects/Mesh.js";

describe("GCodeExporter", () => {
  it("slices transformed mesh geometry into deterministic paths", () => {
    const mesh = new Mesh(new BoxGeometry(2, 2, 2), new BasicMaterial());
    mesh.position.x = 1;
    const exporter = new GCodeExporter();
    const slices = exporter.slice(mesh, { layers: [0] });
    expect(slices).toHaveLength(1);
    expect(slices[0]?.paths).toHaveLength(1);
    expect(slices[0]?.paths[0]?.points.length).toBe(5);
    expect(slices[0]?.paths[0]?.points[0]?.x).toBe(0);
    expect(slices[0]?.paths[0]?.points[0]?.y).toBe(-1);
    expect(slices[0]?.paths[0]?.points.at(-1)).toEqual(
      slices[0]?.paths[0]?.points[0],
    );
  });

  it("serializes stable setup, movement, and optional extrusion commands", () => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial());
    const exporter = new GCodeExporter();
    const options = { layers: [0], extrusionPerUnit: 0.5, precision: 2 };
    const first = exporter.parse(mesh, options);
    const second = exporter.parse(mesh, options);
    expect(first).toBe(second);
    expect(first).toContain("; EASEL G-code export");
    expect(first).toContain("G21 ; millimeters");
    expect(first).toContain("M82 ; absolute extrusion");
    expect(first).toMatch(/G0 X-0\.5 Y-0\.5 Z0 F3000/);
    expect(first).toMatch(/G1 X0\.5 Y-0\.5 E[0-9.]+ F1200/);
    expect(first.endsWith("M2 ; end of program\n")).toBe(true);
  });

  it("supports explicit paths without requiring a mesh", () => {
    const text = new GCodeExporter().parseSlices(
      [
        {
          z: 3,
          paths: [
            {
              points: [
                { x: 0, y: 0, z: 3 },
                { x: 2, y: 0, z: 3 },
              ],
            },
          ],
        },
      ],
      { units: "inch", includeHeader: true, includeFooter: false },
    );
    expect(text).toContain("G20 ; inches");
    expect(text).toContain("G0 X0 Y0 Z3 F3000");
    expect(text).toContain("G1 X2 Y0 F1200");
    expect(text.endsWith("\n")).toBe(true);
    expect(text).not.toContain("M2 ; end of program");
  });
});
