import { describe, expect, it } from "bun:test";
import { DrawList } from "../../../src/pipeline/DrawList.ts";
import { PainterSort } from "../../../src/pipeline/PainterSort.ts";

interface TestTriangleBuffer {
  length: number;
  buildSortOrder(): void;
  sort(): void;
}

interface TestDrawCall {
  centroid: { x: number; y: number; z: number };
  material: { layer: number; opacity: number; transparent: boolean };
  faceIndices: never[];
  projectedVerts: never[];
  triangles: TestTriangleBuffer | undefined;
  mesh: Record<string, never>;
}

function addDrawCall(list: DrawList, drawCall: TestDrawCall): void {
  list.add(drawCall as unknown as Parameters<DrawList["add"]>[0]);
}

function makeDrawCall(
  x: number,
  y: number,
  layer = 0,
  transparent = false,
): TestDrawCall {
  return {
    centroid: { x, y, z: 0 },
    material: { layer, opacity: transparent ? 4 : 0, transparent },
    faceIndices: [],
    projectedVerts: [],
    triangles: undefined,
    mesh: {},
  };
}

describe("PainterSort", () => {
  const sorter = new PainterSort();
  const camera = { x: 0, y: 0 };

  it("does not reorder opaque-only draw calls by distance", () => {
    const list = new DrawList();
    const near = makeDrawCall(1, 0);
    const far = makeDrawCall(10, 0);
    addDrawCall(list, far);
    addDrawCall(list, near);
    sorter.sort(list, camera);
    expect(list.calls[0]).toBe(far);
    expect(list.calls[1]).toBe(near);
  });

  it("still sorts opaques front-to-back when transparents are present", () => {
    const list = new DrawList();
    const opaqueNear = makeDrawCall(1, 0, 0, false);
    const opaqueFar = makeDrawCall(10, 0, 0, false);
    const transparent = makeDrawCall(5, 0, 0, true);
    addDrawCall(list, opaqueFar);
    addDrawCall(list, transparent);
    addDrawCall(list, opaqueNear);
    sorter.sort(list, camera);
    // Opaques first and front-to-back among them.
    expect(list.calls[0]).toBe(opaqueNear);
    expect(list.calls[1]).toBe(opaqueFar);
    expect(list.calls[2]).toBe(transparent);
  });

  it("sorts transparent meshes back-to-front for correct blending", () => {
    const list = new DrawList();
    const near = makeDrawCall(1, 0, 0, true);
    const far = makeDrawCall(10, 0, 0, true);
    addDrawCall(list, near);
    addDrawCall(list, far);
    sorter.sort(list, camera);
    expect(list.calls[0]).toBe(far);
    expect(list.calls[1]).toBe(near);
  });

  it("renders opaques before transparents", () => {
    const list = new DrawList();
    const opaqueNear = makeDrawCall(1, 0, 0, false);
    const transparentFar = makeDrawCall(10, 0, 0, true);
    addDrawCall(list, transparentFar);
    addDrawCall(list, opaqueNear);
    sorter.sort(list, camera);
    expect(list.calls[0].material.opacity).toBe(0);
    expect(list.calls[1].material.transparent).toBe(true);
  });

  it("sortObjects=false preserves opaque traversal order", () => {
    const list = new DrawList();
    const near = makeDrawCall(1, 0);
    const far = makeDrawCall(10, 0);
    addDrawCall(list, near);
    addDrawCall(list, far);
    sorter.sort(list, camera, false);
    expect(list.calls[0]).toBe(near);
    expect(list.calls[1]).toBe(far);
  });

  it("sortObjects=false still renders transparent draw calls after opaques", () => {
    const list = new DrawList();
    const transparentNear = makeDrawCall(1, 0, 0, true);
    const opaque = makeDrawCall(5, 0);
    const transparentFar = makeDrawCall(10, 0, 0, true);
    addDrawCall(list, transparentNear);
    addDrawCall(list, opaque);
    addDrawCall(list, transparentFar);
    sorter.sort(list, camera, false);
    expect(list.calls[0]).toBe(opaque);
    expect(list.calls[1]).toBe(transparentFar);
    expect(list.calls[2]).toBe(transparentNear);
  });

  it("does not sort opaque depth-buffered triangle buffers", () => {
    const list = new DrawList();
    let sorted = false;
    const dc = makeDrawCall(1, 0);
    dc.triangles = {
      length: 2,
      buildSortOrder: () => {
        throw new Error("identity sort should not be built");
      },
      sort: () => {
        sorted = true;
      },
    };
    addDrawCall(list, dc);
    sorter.sort(list, camera);
    expect(sorted).toBe(false);
  });

  it("sorts transparent triangle buffers", () => {
    const list = new DrawList();
    let sorted = false;
    const dc = makeDrawCall(1, 0, 0, true);
    dc.triangles = {
      length: 2,
      buildSortOrder: () => {
        /* called by TriangleBuffer.sort in real buffers */
      },
      sort: () => {
        sorted = true;
      },
    };
    addDrawCall(list, dc);
    sorter.sort(list, camera);
    expect(sorted).toBe(true);
  });

  it("layer 1 appears after layer 0 at same distance", () => {
    const list = new DrawList();
    const bg = makeDrawCall(5, 0, 1);
    const fg = makeDrawCall(5, 0, 0);
    addDrawCall(list, bg);
    addDrawCall(list, fg);
    sorter.sort(list, camera);
    expect(list.calls[0].material.layer).toBe(0);
    expect(list.calls[1].material.layer).toBe(1);
  });

  it("does not throw on empty DrawList", () => {
    const list = new DrawList();
    expect(() => sorter.sort(list, camera)).not.toThrow();
  });

  it("single draw call remains unchanged", () => {
    const list = new DrawList();
    const dc = makeDrawCall(3, 3);
    addDrawCall(list, dc);
    sorter.sort(list, camera);
    expect(list.calls[0]).toBe(dc);
  });
});
