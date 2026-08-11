import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.ts";
import { Attribute } from "@/geometry/Attribute.js";
import { Vector4 } from "@/math/Vector4.js";

describe("Vector4.fromBufferAttribute", () => {
  it("reads all components from the selected attribute record", () => {
    const attribute = new Attribute(
      new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]),
      4,
    );

    expect(new Vector4().fromBufferAttribute(attribute, 1)).toMatchVector({
      x: 5,
      y: 6,
      z: 7,
      w: 8,
    });
  });

  it("uses normalized component values", () => {
    const attribute = new Attribute(new Uint8Array([0, 64, 128, 255]), 4, true);

    expect(new Vector4().fromBufferAttribute(attribute, 0)).toMatchVector({
      x: 0,
      y: 64 / 255,
      z: 128 / 255,
      w: 1,
    });
  });

  it("returns the vector instance for chaining", () => {
    const vector = new Vector4();
    const attribute = new Attribute(new Float32Array([9, 8, 7, 6]), 4);

    expect(vector.fromBufferAttribute(attribute, 0)).toBe(vector);
  });
});
