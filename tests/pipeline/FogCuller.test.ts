import { describe, expect, it } from "bun:test";
import { FogCuller } from "@/pipeline/FogCuller.js";
import { makeDrawList } from "../_helpers/draw-calls.ts";

describe("FogCuller", () => {
  const culler = new FogCuller();
  const camera = { x: 0, y: 0, z: 0 };

  it("no fog: all draw calls pass", () => {
    const list = makeDrawList([1, 0], [5, 0], [20, 0]);
    culler.cull(list, undefined, camera);
    expect(list.length).toBe(3);
  });

  it("no fog (undefined): all draw calls pass", () => {
    const list = makeDrawList([1, 0], [10, 0]);
    culler.cull(list, undefined, camera);
    expect(list.length).toBe(2);
  });

  it("with fog: near draw calls pass", () => {
    const fog = { near: 1, far: 10, color: { r: 0, g: 0, b: 0 } };
    const list = makeDrawList([1, 0], [2, 0]);
    culler.cull(list, fog, camera);
    expect(list.length).toBe(2);
  });

  it("with fog: far draw calls are culled", () => {
    const fog = { near: 1, far: 5, color: { r: 0, g: 0, b: 0 } };
    const list = makeDrawList([1, 0], [10, 0]);
    culler.cull(list, fog, camera);
    expect(list.length).toBe(1);
    expect(list.calls[0].centroid.x).toBe(1);
  });

  it("3D distance check culls correctly", () => {
    const fog = { near: 1, far: 5, color: { r: 0, g: 0, b: 0 } };
    const list = makeDrawList([3, 0, 4]); // distance = 5, exactly at far
    culler.cull(list, fog, camera);
    expect(list.length).toBe(1);
  });

  it("returns the same DrawList instance", () => {
    const list = makeDrawList([1, 0]);
    const result = culler.cull(list, undefined, camera);
    expect(result).toBe(list);
  });
});
