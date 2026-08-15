import { describe, expect, it } from "bun:test";
import { Attribute } from "@/geometry/Attribute.ts";
import { Geometry } from "@/geometry/Geometry.ts";
import { GeometryLoader } from "@/index.ts";

const POSITION_ATTRIBUTE_KEY = "position";

describe("GeometryLoader", () => {
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

    const geometry = new GeometryLoader().parse(json);
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

  it("preserves every supported serialized attribute storage type", () => {
    const cases = [
      ["Float32Array", Float32Array],
      ["Int8Array", Int8Array],
      ["Uint8Array", Uint8Array],
      ["Uint8ClampedArray", Uint8ClampedArray],
      ["Int16Array", Int16Array],
      ["Uint16Array", Uint16Array],
      ["Int32Array", Int32Array],
      ["Uint32Array", Uint32Array],
    ] as const;

    for (const [type, ArrayType] of cases) {
      const geometry = new GeometryLoader().parse({
        data: {
          attributes: {
            value: { itemSize: 1, type, array: [1, 2, 3] },
          },
        },
      });
      expect(geometry.getAttribute("value")?.array).toBeInstanceOf(ArrayType);
    }
  });

  it("preserves a serialized Uint32 index type", () => {
    const geometry = new GeometryLoader().parse({
      data: {
        attributes: {},
        index: {
          type: "Uint32Array",
          array: [0, 1, 2],
        },
      },
    });

    expect(geometry.index).toBeInstanceOf(Uint32Array);
    expect(geometry.index).toEqual(new Uint32Array([0, 1, 2]));
  });

  it("promotes sparse high indices to Uint32 storage without wrapping", () => {
    const geometry = new GeometryLoader().parse({
      data: {
        attributes: {},
        index: {
          type: "Uint16Array",
          array: [0, 70000, 2],
        },
      },
    });

    expect(geometry.index).toBeInstanceOf(Uint32Array);
    expect(geometry.index?.[1]).toBe(70000);
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

    const geometry = new GeometryLoader().parse(json);
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

    const geometry = new GeometryLoader().parse(json);
    expect(geometry.morphAttributes).toBeDefined();
    expect(geometry.morphAttributes?.[POSITION_ATTRIBUTE_KEY]).toHaveLength(1);
    expect(
      geometry.morphAttributes?.[POSITION_ATTRIBUTE_KEY][0]?.itemSize,
    ).toBe(3);
    expect(geometry.morphAttributes?.[POSITION_ATTRIBUTE_KEY][0]?.name).toBe(
      "morph0",
    );
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

    const geometry = new GeometryLoader().parse(json);
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

    const geometry = new GeometryLoader().parse(json);
    const color = geometry.getAttribute("color");
    expect(color?.normalized).toBe(true);
    expect(color?.name).toBe("vertexColor");
  });

  it("round-trips serialized CPU geometry state and typed morph data", () => {
    const source = new Geometry();
    const color = new Attribute(
      new Uint8Array([255, 0, 0, 0, 255, 0]),
      3,
      true,
    );
    color.name = "packedColor";
    const morph = new Attribute(new Int16Array([1, 2, 3, 4, 5, 6]), 3);
    morph.name = "offset";
    source.setPositions([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    source.setAttribute("color", color);
    source.index = new Uint32Array([0, 1, 2]);
    source.morphAttributes = { position: [morph] };
    source.morphTargetsRelative = true;
    source.type = "CustomGeometry";
    source.name = "serialized";
    source.parameters = { source: "fixture" };
    source.userData = { role: "test" };
    source.setDrawRange(1, 2);
    source.computeBoundingSphere();

    const geometry = new GeometryLoader().parse(source.toJSON());

    const parsedColor = geometry.getAttribute("color");
    expect(parsedColor?.array).toBeInstanceOf(Uint8Array);
    expect(parsedColor?.normalized).toBe(true);
    expect(parsedColor?.name).toBe("packedColor");
    expect(geometry.index).toBeInstanceOf(Uint32Array);
    expect(
      geometry.morphAttributes?.[POSITION_ATTRIBUTE_KEY]?.[0]?.array,
    ).toBeInstanceOf(Int16Array);
    expect(geometry.morphAttributes?.[POSITION_ATTRIBUTE_KEY]?.[0]?.name).toBe(
      "offset",
    );
    expect(geometry.morphTargetsRelative).toBe(true);
    expect(geometry.name).toBe("serialized");
    expect(geometry.type).toBe("CustomGeometry");
    expect(geometry.parameters).toEqual({ source: "fixture" });
    expect(geometry.userData).toEqual({ role: "test" });
    expect(geometry.drawRange).toEqual({ start: 1, count: 2 });
    expect(geometry.boundingSphere?.center.toArray()).toEqual(
      source.boundingSphere?.center.toArray(),
    );
    expect(geometry.boundingSphere?.radius).toBe(source.boundingSphere?.radius);
  });

  it("restores the default draw range after JSON encodes infinity as null", () => {
    const geometry = new GeometryLoader().parse({
      data: {
        attributes: {},
        drawRange: { start: 0, count: null },
      },
    });

    expect(geometry.drawRange).toEqual({
      start: 0,
      count: Number.POSITIVE_INFINITY,
    });
  });

  it("keeps the original flat GeometryLoader input shape compatible", () => {
    const geometry = new GeometryLoader().parse({
      attributes: {
        position: {
          itemSize: 3,
          array: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        },
      },
      index: { array: [0, 1, 2] },
    });

    expect(geometry.getAttribute("position")?.array).toBeInstanceOf(
      Float32Array,
    );
    expect(geometry.index).toEqual(new Uint16Array([0, 1, 2]));
  });
});
