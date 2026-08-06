import { describe, expect, it } from "bun:test";
import { Attribute } from "@/geometry/Attribute.ts";
import { Geometry } from "@/geometry/Geometry.ts";
import { BufferGeometryLoader } from "@/index.ts";

describe("BufferGeometryLoader", () => {
  it("parses attributes and index into a Geometry", () => {
    const json = {
      data: {
        attributes: {
          position: {
            itemSize: 3,
            type: "Float32Array",
            array: [0, 0, 0, 1, 0, 0, 0, 1, 0],
          },
          uv: {
            itemSize: 2,
            type: "Float32Array",
            array: [0, 0, 1, 0, 0, 1],
          },
        },
        index: {
          type: "Uint16Array",
          array: [0, 1, 2],
        },
      },
    };

    const geometry = new BufferGeometryLoader().parse(json);
    expect(geometry).toBeInstanceOf(Geometry);

    const position = geometry.getAttribute("position");
    expect(position).toBeInstanceOf(Attribute);
    expect(position?.itemSize).toBe(3);
    expect(position?.count).toBe(3);
    expect(position?.getX(1)).toBe(1);

    const uv = geometry.getAttribute("uv");
    expect(uv?.itemSize).toBe(2);
    expect(uv?.count).toBe(3);

    expect(geometry.index).toBeInstanceOf(Uint16Array);
    expect(geometry.index?.length).toBe(3);
    expect(geometry.index?.[0]).toBe(0);
  });

  it("parses without an index when omitted", () => {
    const json = {
      data: {
        attributes: {
          position: {
            itemSize: 3,
            type: "Float32Array",
            array: [0, 0, 0, 1, 0, 0, 0, 1, 0],
          },
        },
      },
    };

    const geometry = new BufferGeometryLoader().parse(json);
    expect(geometry.index).toBeUndefined();
    expect(geometry.getAttribute("position")?.count).toBe(3);
  });

  it("parses morphAttributes and morphTargetsRelative", () => {
    const json = {
      data: {
        attributes: {
          position: {
            itemSize: 3,
            type: "Float32Array",
            array: [0, 0, 0, 1, 0, 0, 0, 1, 0],
          },
        },
        morphAttributes: {
          position: [
            {
              itemSize: 3,
              type: "Float32Array",
              array: [0.5, 0, 0, 1.5, 0, 0, 0, 1.5, 0],
              name: "morph0",
            },
          ],
        },
        morphTargetsRelative: true,
      },
    };

    const geometry = new BufferGeometryLoader().parse(json);
    expect(geometry.morphAttributes).toBeDefined();
    expect(geometry.morphAttributes?.["position"]).toHaveLength(1);
    expect(geometry.morphAttributes?.["position"][0]?.itemSize).toBe(3);
    expect(geometry.morphAttributes?.["position"][0]?.name).toBe("morph0");
    expect(geometry.morphTargetsRelative).toBe(true);
  });

  it("copies name and userData from the serialized definition", () => {
    const json = {
      data: {
        attributes: {
          position: {
            itemSize: 3,
            type: "Float32Array",
            array: [0, 0, 0, 1, 0, 0, 0, 1, 0],
          },
        },
      },
      name: "test-geometry",
      userData: { label: "custom" },
    };

    const geometry = new BufferGeometryLoader().parse(json);
    expect(geometry.name).toBe("test-geometry");
    expect(geometry.userData).toEqual({ label: "custom" });
  });

  it("preserves attribute name and normalized flag", () => {
    const json = {
      data: {
        attributes: {
          color: {
            itemSize: 3,
            type: "Float32Array",
            array: [1, 0, 0, 0, 1, 0],
            normalized: true,
            name: "vertexColor",
          },
        },
      },
    };

    const geometry = new BufferGeometryLoader().parse(json);
    const color = geometry.getAttribute("color");
    expect(color?.normalized).toBe(true);
    expect(color?.name).toBe("vertexColor");
  });
});
