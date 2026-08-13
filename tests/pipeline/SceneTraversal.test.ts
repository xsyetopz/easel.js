import { expect, it } from "bun:test";
import { Side } from "@/core/Constants.ts";
import { Matrix4 } from "@/math/Matrix4.js";
import { DrawList } from "@/pipeline/DrawList.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";
import { defined } from "../_helpers/defined.ts";
import {
  makeTraversalCamera as makeCamera,
  makeTraversalMeshNode as makeMeshNode,
  makeTraversalScene as makeScene,
} from "../_helpers/scene-traversal.ts";

type ColorAttribute = {
  array: ArrayLike<number>;
  itemSize: number;
};

type VertexColorNode = {
  material: {
    side: Side;
    shading: number;
    vertexColors: boolean;
  };
};

const traversal = new SceneTraversal();

function makeVertexColorNode(
  attributes: Map<string, ColorAttribute>,
): VertexColorNode & Record<string, unknown> {
  return {
    type: "Mesh",
    visible: true,
    children: [],
    matrixWorld: new Matrix4(),
    updateMatrixWorld: (): void => {
      /* no-op */
    },
    geometry: {
      getAttribute: (name: string): ColorAttribute | undefined =>
        attributes.get(name),
      index: { array: new Uint16Array([0, 1, 2]) },
    },
    material: { side: Side.Double, shading: 0, vertexColors: true },
  };
}

it("returns a DrawList", () => {
  const result = traversal.traverse(makeScene(), makeCamera());
  expect(result).toBeInstanceOf(DrawList);
});

it("empty scene produces empty DrawList", () => {
  const result = traversal.traverse(makeScene(), makeCamera());
  expect(result).toHaveLength(0);
});

it("does not update scene matrices implicitly", () => {
  const scene = {
    visible: true,
    children: [],
    updated: false,
    updateMatrixWorld(updateParents?: boolean, updateChildren?: boolean): void {
      // will throw if called unbound (this === undefined)
      this.updated = updateParents === true && updateChildren === true;
    },
  };

  expect(() =>
    traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    ),
  ).not.toThrow();
  expect(scene.updated).toBe(false);
});

it("scene with 2 visible meshes produces 2 draw calls", () => {
  const scene = makeScene(makeMeshNode(), makeMeshNode());
  const result = traversal.traverse(
    scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
    makeCamera(),
  );
  expect(result).toHaveLength(2);
});

it("reuses DrawCall instances across traverse calls", () => {
  const scene = makeScene(makeMeshNode());
  const cam = makeCamera();
  const first = traversal.traverse(scene, cam).calls[0];
  const second = traversal.traverse(scene, cam).calls[0];
  expect(second).toBe(first);
});

it("attaches a matching geometry color attribute without copying it", () => {
  const colors = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0]);
  const attributes = new Map<string, ColorAttribute>([
    [
      "position",
      {
        array: new Float32Array([0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0]),
        itemSize: 3,
      },
    ],
    ["color", { array: colors, itemSize: 3 }],
  ]);
  const node = makeVertexColorNode(attributes);
  const result = traversal.traverse(makeScene(node), makeCamera(), 100, 100);
  const drawCall = defined(result.calls[0]);
  expect(drawCall.vertexColorData).toBe(colors);
  expect(drawCall.vertexColorItemSize).toBe(3);

  node.material.vertexColors = false;
  const disabledResult = traversal.traverse(
    makeScene(node),
    makeCamera(),
    100,
    100,
  );
  expect(defined(disabledResult.calls[0]).vertexColorData.length).toBe(0);

  node.material.vertexColors = true;
  attributes.set("color", { array: new Float32Array(12), itemSize: 4 });
  const reusedResult = traversal.traverse(
    makeScene(node),
    makeCamera(),
    100,
    100,
  );
  const reusedDrawCall = defined(reusedResult.calls[0]);
  expect(reusedDrawCall).toBe(drawCall);
  expect(reusedDrawCall.vertexColorData.length).toBe(0);
  expect(reusedDrawCall.vertexColorItemSize).toBe(0);
});

it("invisible mesh is excluded", () => {
  const scene = makeScene(makeMeshNode(true), makeMeshNode(false));
  const result = traversal.traverse(
    scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
    makeCamera(),
  );
  expect(result).toHaveLength(1);
});

it("nested visible mesh is included", () => {
  const inner = makeMeshNode();
  const outer = { ...makeMeshNode(true), children: [inner] };
  const scene = makeScene(outer);
  const result = traversal.traverse(
    scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
    makeCamera(),
  );
  expect(result).toHaveLength(2);
});
