import { describe, expect, it } from "bun:test";
import { PolarGridHelper } from "@/helpers/PolarGridHelper.js";
import { Color } from "@/math/Color.js";

function attribute(helper: PolarGridHelper, name: string): Float32Array {
  const array = helper.geometry?.getAttribute(name)?.array;
  if (!(array instanceof Float32Array)) throw new Error(`${name} missing`);
  return array;
}

describe("PolarGridHelper", () => {
  it("builds sectors and rings with deterministic storage", () => {
    const helper = new PolarGridHelper(2, 4, 2, 4);
    const positions = attribute(helper, "position");
    expect(positions).toHaveLength((4 + 2 * 4) * 6);
    expect(Array.from(positions.slice(0, 11))).toEqual([
      0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0,
    ]);
    expect(positions[11]).toBeCloseTo(0, 12);
  });

  it("accepts the complete color input contract", () => {
    const helper = new PolarGridHelper(
      1,
      2,
      1,
      3,
      "#ff0000",
      new Color("#0000ff"),
    );
    const colors = attribute(helper, "color");
    expect(Array.from(colors.slice(0, 6))).toEqual([0, 0, 1, 0, 0, 1]);
    expect(Array.from(colors.slice(6, 12))).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("rejects degenerate grids instead of inheriting silent quirks", () => {
    expect(() => new PolarGridHelper(0)).toThrow("radius");
    expect(() => new PolarGridHelper(1, 1)).toThrow("sectors");
    expect(() => new PolarGridHelper(1, 2, 0)).toThrow("rings");
    expect(() => new PolarGridHelper(1, 2, 1, 2)).toThrow("divisions");
  });
});
