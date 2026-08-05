import { describe, expect, it } from "bun:test";
import { AxesHelper } from "@/helpers/AxesHelper.js";
import { Color } from "@/math/Color.js";

function colors(helper: AxesHelper): Float32Array {
  const array = helper.geometry?.getAttribute("color")?.array;
  if (!(array instanceof Float32Array)) throw new Error("color missing");
  return array;
}

describe("AxesHelper", () => {
  it("builds canonical RGB axes", () => {
    const helper = new AxesHelper(2);
    expect(helper.geometry?.getAttribute("position")?.count).toBe(6);
    expect(Array.from(colors(helper))).toEqual([
      1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1,
    ]);
  });

  it("keeps color assignment inert until explicit update", () => {
    const helper = new AxesHelper();
    const storage = colors(helper);
    helper.colors = {
      x: "#ffffff",
      y: new Color(0x000000),
      z: 0xff00ff,
    };
    expect(Array.from(storage.slice(0, 3))).toEqual([1, 0, 0]);
    expect(helper.updateColors()).toBe(helper);
    expect(colors(helper)).toBe(storage);
    expect(Array.from(storage)).toEqual([
      1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1,
    ]);
    expect(helper.geometry?.getAttribute("color")?.needsUpdate).toBe(true);
  });

  it("supports direct canonical Color mutation with explicit publication", () => {
    const helper = new AxesHelper();
    helper.colors.x.set(0x123456);
    expect(Array.from(colors(helper).slice(0, 3))).toEqual([1, 0, 0]);
    helper.updateColors();
    expect(helper.colors.x.hex).toBe(0x123456);
  });

  it("rejects invalid sizes", () => {
    expect(() => new AxesHelper(0)).toThrow("positive and finite");
    expect(() => new AxesHelper(Number.NaN)).toThrow("positive and finite");
  });
});
