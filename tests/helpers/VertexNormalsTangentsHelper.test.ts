import { describe, expect, it } from "bun:test";
import { Geometry } from "@/geometry/Geometry.js";
import { VertexNormalsHelper } from "@/helpers/VertexNormalsHelper.js";
import { VertexTangentsHelper } from "@/helpers/VertexTangentsHelper.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { Mesh } from "@/objects/Mesh.js";

function positions(
  helper: VertexNormalsHelper | VertexTangentsHelper,
): Float32Array {
  const array = helper.geometry?.getAttribute("position")?.array;
  if (!(array instanceof Float32Array)) throw new Error("position missing");
  return array;
}

function makeMesh(): Mesh {
  const geometry = new Geometry()
    .setPositions([0, 0, 0, 1, 0, 0, 0, 1, 0])
    .setNormals([0, 0, 1, 0, 0, 1, 0, 0, 1])
    .setUVs([0, 0, 1, 0, 0, 1]);
  geometry.index = [0, 1, 2];
  geometry.computeTangents();
  const mesh = new Mesh(geometry, new BasicMaterial({ color: 0xffffff }));
  mesh.position.set(2, 3, 4);
  mesh.scale.set(2, 3, 4);
  return mesh;
}

describe("VertexNormalsHelper", () => {
  it("writes transformed normal line segments and updates in place", () => {
    const mesh = makeMesh();
    const helper = new VertexNormalsHelper(mesh, 2);
    const storage = positions(helper);

    expect(helper.type).toBe("VertexNormalsHelper");
    expect(helper.isVertexNormalsHelper).toBe(true);
    expect(helper.matrixAutoUpdate).toBe(false);
    expect(Array.from(storage.slice(0, 6))).toEqual([2, 3, 4, 2, 3, 6]);

    mesh.position.x = 4;
    helper.update();
    expect(positions(helper)).toBe(storage);
    expect(Array.from(storage.slice(0, 3))).toEqual([4, 3, 4]);
  });

  it("rejects meshes without a normal channel", () => {
    const mesh = new Mesh(new Geometry().setPositions([0, 0, 0]));
    expect(() => new VertexNormalsHelper(mesh)).toThrow("normal");
  });
});

describe("VertexTangentsHelper", () => {
  it("writes transformed tangent line segments and updates in place", () => {
    const mesh = makeMesh();
    const helper = new VertexTangentsHelper(mesh, 2);
    const storage = positions(helper);

    expect(helper.type).toBe("VertexTangentsHelper");
    expect(helper.isVertexTangentsHelper).toBe(true);
    expect(Array.from(storage.slice(0, 6))).toEqual([2, 3, 4, 4, 3, 4]);

    mesh.position.y = 8;
    helper.update();
    expect(positions(helper)).toBe(storage);
    expect(Array.from(storage.slice(0, 3))).toEqual([2, 8, 4]);
  });

  it("rejects meshes without a tangent channel", () => {
    const mesh = new Mesh(
      new Geometry().setPositions([0, 0, 0]),
      new BasicMaterial({ color: 0xffffff }),
    );
    expect(() => new VertexTangentsHelper(mesh)).toThrow("tangent");
  });
});
