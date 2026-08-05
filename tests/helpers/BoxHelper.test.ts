import { describe, expect, it } from "bun:test";
import { BoxHelper } from "@/helpers/BoxHelper.js";
import { Box3 } from "@/math/Box3.js";
import { Vector3 } from "@/math/Vector3.js";

function positions(helper: BoxHelper): Float32Array {
  const array = helper.geometry?.getAttribute("position")?.array;
  if (!(array instanceof Float32Array)) throw new Error("position missing");
  return array;
}

describe("BoxHelper", () => {
  it("does not read bounds or rebuild geometry during construction", () => {
    const source = {
      geometry: {
        get boundingBox(): Box3 {
          throw new Error("bounds read implicitly");
        },
      },
    };
    const helper = new BoxHelper(source);
    expect(Array.from(positions(helper))).toEqual(new Array(72).fill(0));
  });

  it("explicitly writes prepared Box3 edges without replacing storage", () => {
    const box = new Box3(new Vector3(-1, -2, -3), new Vector3(4, 5, 6));
    const helper = new BoxHelper(box);
    const storage = positions(helper);
    expect(helper.update()).toBe(helper);
    expect(positions(helper)).toBe(storage);
    expect(storage.slice(0, 6)).toEqual(
      new Float32Array([-1, -2, -3, 4, -2, -3]),
    );
    expect(helper.geometry?.getAttribute("position")?.needsUpdate).toBe(true);
  });

  it("uses one canonical source property for boxes and prepared objects", () => {
    const helper = new BoxHelper(new Box3());
    const prepared = {
      geometry: {
        boundingBox: new Box3(new Vector3(1, 2, 3), new Vector3(4, 5, 6)),
      },
    };
    helper.source = prepared;
    helper.update();
    expect(helper.source).toBe(prepared);
    expect(positions(helper).slice(0, 6)).toEqual(
      new Float32Array([1, 2, 3, 4, 2, 3]),
    );
  });

  it("rejects objects whose bounds have not been prepared", () => {
    const helper = new BoxHelper({ geometry: {} });
    expect(() => helper.update()).toThrow("prepared geometry.boundingBox");
  });
});
