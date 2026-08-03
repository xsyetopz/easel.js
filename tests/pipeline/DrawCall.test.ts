import { describe, expect, it } from "bun:test";
import { Matrix4 } from "@/math/Matrix4.js";
import { DrawCall } from "@/pipeline/DrawCall.js";

function makeMesh(x = 0, y = 0, z = 0) {
  const m = new Matrix4();
  m.makeTranslation(x, y, z);
  return { matrixWorld: m, type: "Mesh" } as unknown as never;
}

function makeMaterial() {
  return { color: 0xffffff } as unknown as never;
}

describe("DrawCall", () => {
  it("stores mesh reference", () => {
    const mesh = makeMesh();
    const dc = new DrawCall(mesh, makeMaterial());
    expect(dc.mesh).toBe(mesh);
  });

  it("stores material reference", () => {
    const mat = makeMaterial();
    const dc = new DrawCall(makeMesh(), mat);
    expect(dc.material).toBe(mat);
  });

  it("centroid is computed from mesh world position", () => {
    const mesh = makeMesh(3, 5, 7);
    const dc = new DrawCall(mesh, makeMaterial());
    expect(dc.centroid.x).toBeCloseTo(3, 5);
    expect(dc.centroid.y).toBeCloseTo(5, 5);
    expect(dc.centroid.z).toBeCloseTo(7, 5);
  });

  it("centroid defaults to (0,0,0) for identity mesh", () => {
    const mesh = makeMesh(0, 0, 0);
    const dc = new DrawCall(mesh, makeMaterial());
    expect(dc.centroid.x).toBeCloseTo(0, 5);
    expect(dc.centroid.y).toBeCloseTo(0, 5);
    expect(dc.centroid.z).toBeCloseTo(0, 5);
  });

  it("projectedVerts starts as empty Float32Array", () => {
    const dc = new DrawCall(makeMesh(), makeMaterial());
    expect(dc.projectedVerts).toBeInstanceOf(Float32Array);
    expect(dc.projectedVerts.length).toBe(0);
    expect(dc.vertCount).toBe(0);
  });
});
