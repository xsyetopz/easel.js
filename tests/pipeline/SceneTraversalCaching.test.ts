import { expect, it } from "bun:test";
import { Side } from "@/core/Constants.ts";
import { Matrix4 } from "@/math/Matrix4.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";
import {
  makeTraversalCamera as makeCamera,
  makeTraversalMeshNode as makeMeshNode,
  makeTraversalScene as makeScene,
} from "../_helpers/scene-traversal.ts";

const traversal = new SceneTraversal();

it("non-indexed geometry generates _sequentialIndices on the geometry object", () => {
  const geometry = {
    getAttribute: (name: string) => {
      if (name === "position") {
        return {
          array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
          itemSize: 3,
        };
      }
      return null;
    },
    index: undefined,
  };
  const node = {
    type: "Mesh",
    visible: true,
    children: [],
    matrixWorld: new Matrix4(),
    updateMatrixWorld: (): void => {
      /* no-op */
    },
    geometry,
    material: { side: Side.Double, shading: 0 },
  };
  const scene = makeScene(node);
  traversal.traverse(scene, makeCamera(), 100, 100);

  const sequentialIndices = (
    geometry as unknown as { _sequentialIndices: Uint32Array }
  )._sequentialIndices;
  expect(sequentialIndices).toBeInstanceOf(Uint32Array);
  expect(sequentialIndices.length).toBe(3);
  expect(Array.from(sequentialIndices)).toEqual([0, 1, 2]);
});

it("does not update visible mesh matrices implicitly", () => {
  let called = false;
  const mesh = makeMeshNode();
  mesh.updateMatrixWorld = (): void => {
    called = true;
  };
  const scene = makeScene(mesh);
  traversal.traverse(scene, makeCamera());
  expect(called).toBe(false);
});

it("second traversal reuses _uvCache - same Float32Array reference", () => {
  const geometry = {
    getAttribute: (name: string) => {
      if (name === "position") {
        return {
          array: new Float32Array([0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0]),
          itemSize: 3,
        };
      }
      if (name === "uv") {
        return {
          array: new Float32Array([0, 0, 1, 0, 0.5, 1]),
          itemSize: 2,
        };
      }
      return null;
    },
    index: { array: new Uint16Array([0, 1, 2]) },
  };
  const node = {
    type: "Mesh",
    visible: true,
    children: [],
    matrixWorld: new Matrix4(),
    updateMatrixWorld: (): void => {
      /* no-op */
    },
    geometry,
    material: {
      side: Side.Double,
      shading: 0,
      map: { data: { data: new Uint8Array([0]), width: 1, height: 1 } },
    },
  };
  const scene = makeScene(node);
  traversal.traverse(scene, makeCamera(), 100, 100);
  const cacheAfterFirst = (geometry as unknown as { _uvCache: Float32Array })
    ._uvCache;
  expect(cacheAfterFirst).toBeInstanceOf(Float32Array);

  traversal.traverse(scene, makeCamera(), 100, 100);
  expect((geometry as unknown as { _uvCache: Float32Array })._uvCache).toBe(
    cacheAfterFirst,
  );
});
