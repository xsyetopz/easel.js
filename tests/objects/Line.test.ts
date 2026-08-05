import { describe, expect, it } from "bun:test";
import { Geometry } from "@/geometry/Geometry.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { LineMaterial } from "@/materials/LineMaterial.js";
import { Line } from "@/objects/Line.js";

describe("Line", () => {
  it("accepts only LineMaterial instances", () => {
    const line = new Line();
    const material = new LineMaterial();
    line.material = material;
    expect(line.material).toBe(material);
    line.material = undefined;
    expect(line.material).toBeUndefined();

    const invalid = new BasicMaterial();
    expect(
      () => new Line(undefined, invalid as unknown as LineMaterial),
    ).toThrow(TypeError);
    const assignInvalidMaterial = (): void => {
      (line as unknown as { material: unknown }).material = invalid;
    };
    expect(assignInvalidMaterial).toThrow(TypeError);
  });

  it("clone and copy preserve geometry and line material", () => {
    const geometry = new Geometry();
    const material = new LineMaterial({ color: 0xff0000 });
    const source = new Line(geometry, material);
    source.name = "source";

    const clone = source.clone();
    expect(clone).toBeInstanceOf(Line);
    expect(clone).not.toBe(source);
    expect(clone.geometry).toBe(geometry);
    expect(clone.material).toBe(material);
    expect(clone.name).toBe("source");

    const destination = new Line();
    destination.copy(source);
    expect(destination.geometry).toBe(geometry);
    expect(destination.material).toBe(material);
    expect(destination.name).toBe("source");
  });
});
