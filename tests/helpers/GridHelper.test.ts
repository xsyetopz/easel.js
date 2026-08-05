import { describe, expect, it } from "bun:test";
import { GridHelper } from "@/helpers/GridHelper.js";
import { Color } from "@/math/Color.js";

function attribute(helper: GridHelper, name: string): Float32Array {
  const array = helper.geometry?.getAttribute(name)?.array;
  if (!(array instanceof Float32Array)) throw new Error(`${name} missing`);
  return array;
}

describe("GridHelper", () => {
  it("builds the expected XZ line topology", () => {
    const helper = new GridHelper(2, 2);
    expect(attribute(helper, "position")).toEqual(
      new Float32Array([
        -1, 0, -1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 0, 0, -1, 0, 0, 1, -1, 0, 0,
        1, 0, 0, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0, 1,
      ]),
    );
  });

  it("accepts Color, number, and string inputs", () => {
    const helper = new GridHelper(2, 2, new Color(0xff0000), "#0000ff");
    const colors = attribute(helper, "color");
    expect(Array.from(colors.slice(0, 6))).toEqual([0, 0, 1, 0, 0, 1]);
    expect(Array.from(colors.slice(12, 18))).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("rejects invalid dimensions instead of emitting corrupt coordinates", () => {
    expect(() => new GridHelper(0)).toThrow("size");
    expect(() => new GridHelper(1, 0)).toThrow("divisions");
    expect(() => new GridHelper(1, 1.5)).toThrow("divisions");
  });
});
