import { describe, expect, it } from "bun:test";
import { LambertMaterial } from "@/materials/LambertMaterial.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { DrawList } from "@/pipeline/DrawList.js";
import { Framebuffer } from "@/pipeline/framebuffer/Framebuffer.js";
import { buildInstancedDrawCalls } from "@/pipeline/InstancedMeshBuilder.js";
import { Rasterizer } from "@/pipeline/rasterizer/Rasterizer.js";
import type { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";
import { appendCenterTriangle } from "../_helpers/rasterizer.js";

function makeCamera() {
  const m = new Matrix4();
  return {
    matrixWorldInverse: m,
    projectionMatrix: m,
  };
}

describe("InstancedMeshBuilder", () => {
  it("reuses a draw call and stores instance tint without material wrappers", () => {
    const material = new LambertMaterial({ color: 0xffffff });

    const node = {
      matrixWorld: new Matrix4(),
      geometry: {
        getAttribute: (name: string) => {
          if (name === "position") {
            return {
              array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
              itemSize: 3,
            };
          }
          if (name === "normal") {
            return {
              array: new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1]),
              itemSize: 3,
            };
          }
          if (name === "color") {
            return {
              array: new Float32Array([1, 0.5, 0, 1, 0.5, 0, 1, 0.5, 0]),
              itemSize: 3,
            };
          }
          return void 0;
        },
        index: { array: new Uint16Array([0, 1, 2]) },
      },
      material,
      instanceMatrix: new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
      ]),
      instanceColor: new Float32Array([0.5, 0.25, 0.75]),
      count: 1,
      frustumCulled: false,
    };

    const fogState = { hasFog: false, fogFar: 0 };
    const frustum = { intersectsSphere: () => true };
    const assembleTrianglesFn = (
      _indices: ArrayLike<number>,
      _verts: Float32Array,
      _worldNormals: Float32Array,
      _uvs: Float32Array,
      _width: number,
      _height: number,
      _material: unknown,
      tmp: { _triangleBuffer?: TriangleBuffer },
    ) => tmp._triangleBuffer as TriangleBuffer;
    const buildUvsFn = () => new Float32Array(0);

    const dl1 = new DrawList();
    buildInstancedDrawCalls(
      node as never,
      makeCamera() as never,
      frustum as never,
      64,
      64,
      dl1,
      fogState,
      assembleTrianglesFn as never,
      buildUvsFn as never,
    );
    expect(dl1.calls).toHaveLength(1);
    const dc1 = dl1.calls[0];
    expect(dc1.material).toBe(material);
    expect(dc1.instanceColorR).toBeCloseTo(0.5);
    expect(dc1.instanceColorG).toBeCloseTo(0.25);
    expect(dc1.instanceColorB).toBeCloseTo(0.75);
    expect(dc1.vertexColorData).toBeInstanceOf(Float32Array);
    expect(dc1.vertexColorItemSize).toBe(3);

    const triangles = dc1.triangles as TriangleBuffer;
    appendCenterTriangle(triangles, -1);
    triangles.vertexIndex.set([0, 1, 2]);
    triangles.buildSortOrder();
    const framebuffer = new Framebuffer(20, 20);
    new Rasterizer().rasterize(dc1 as never, framebuffer, undefined);
    const pixel = framebuffer.getPixel(10, 7);
    expect(pixel.r).toBe(128);
    expect(pixel.g).toBe(32);
    expect(pixel.b).toBe(0);

    // Mutate instanceColor to ensure the cached draw call is updated in place.
    (node.instanceColor as Float32Array)[0] = 0.2;

    const dl2 = new DrawList();
    buildInstancedDrawCalls(
      node as never,
      makeCamera() as never,
      frustum as never,
      64,
      64,
      dl2,
      fogState,
      assembleTrianglesFn as never,
      buildUvsFn as never,
    );
    expect(dl2.calls).toHaveLength(1);
    const dc2 = dl2.calls[0];
    expect(dc2).toBe(dc1);
    expect(dc2.material).toBe(material);
    expect(dc2.instanceColorR).toBeCloseTo(0.2);
  });
});
