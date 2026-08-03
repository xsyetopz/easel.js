import { describe, expect, it } from "bun:test";
import { DrawList } from "@/pipeline/DrawList.js";
import { TileDistanceSorter } from "@/pipeline/sorting/TileDistanceSorter.js";

function makeDrawCall(x: number, y: number, z = 0) {
  return {
    centroid: { x, y, z },
    mesh: {},
    material: {},
  } as unknown as import("@/pipeline/DrawCall.js").DrawCall;
}

describe("TileDistanceSorter", () => {
  const sorter = new TileDistanceSorter();
  const camera = { x: 0, y: 0 };

  it("sorts back-to-front by Manhattan distance", () => {
    const list = new DrawList();
    const near = makeDrawCall(1, 0);
    const far = makeDrawCall(10, 0);
    list.add(near);
    list.add(far);
    sorter.sort(list, camera);
    expect(list.calls[0]).toBe(far);
    expect(list.calls[1]).toBe(near);
  });

  it("three draw calls sorted back-to-front", () => {
    const list = new DrawList();
    const a = makeDrawCall(1, 0);
    const b = makeDrawCall(5, 0);
    const c = makeDrawCall(3, 0);
    list.add(a);
    list.add(b);
    list.add(c);
    sorter.sort(list, camera);
    expect(list.calls[0]).toBe(b);
    expect(list.calls[1]).toBe(c);
    expect(list.calls[2]).toBe(a);
  });

  it("single draw call is unchanged", () => {
    const list = new DrawList();
    const dc = makeDrawCall(5, 5);
    list.add(dc);
    sorter.sort(list, camera);
    expect(list.calls[0]).toBe(dc);
  });
});
