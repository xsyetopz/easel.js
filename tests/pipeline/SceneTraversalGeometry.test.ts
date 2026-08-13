import { describe, expect, it } from "bun:test";
import { Side } from "@/core/Constants.ts";
import { Matrix4 } from "@/math/Matrix4.js";
import { ScanlineFill } from "@/pipeline/rasterizer/ScanlineFill.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";
import type { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";
import { defined } from "../_helpers/defined.ts";
import {
  getFirstTriangleBufferLength,
  makeTraversalCamera as makeCamera,
  makeTraversalScene as makeScene,
} from "../_helpers/scene-traversal.ts";

type TraversalCamera = Parameters<SceneTraversal["traverse"]>[1];

type Attribute = {
  array: ArrayLike<number>;
  itemSize: number;
};

type TestMeshNode = {
  type: "Mesh" | "Points";
  visible: boolean;
  children: [];
  matrixWorld: Matrix4;
  updateMatrixWorld: () => void;
  geometry: {
    getAttribute: (name: string) => Attribute | null | undefined;
    index: { array: ArrayLike<number> } | undefined;
  };
  material: {
    side: Side;
    shading: number;
    points?: boolean;
  };
};

function makeMeshNodeWithSide(
  positions: ArrayLike<number>,
  side: Side,
): TestMeshNode {
  return {
    type: "Mesh",
    visible: true,
    children: [],
    matrixWorld: new Matrix4(),
    updateMatrixWorld: (): void => {
      /* no-op */
    },
    geometry: {
      getAttribute: (name: string): Attribute | null => {
        if (name === "position") {
          return {
            array: new Float32Array(positions),
            itemSize: 3,
          };
        }
        if (name === "normal") {
          return {
            array: new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1]),
            itemSize: 3,
          };
        }
        return null;
      },
      index: { array: new Uint16Array([0, 1, 2]) },
    },
    material: { side, shading: 0 },
  };
}

// CCW triangle (v0 top, v1 bottom-left, v2 bottom-right) in NDC produces:
//   with width=height=100: sx0=50,sy0=25, sx1=25,sy1=75, sx2=75,sy2=75
//   cross = (25-50)*(75-25) - (75-25)*(75-50) = -2500 → negative → front-facing
const ccwPositions = [0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0];
// CW positions (v1/v2 swapped) → cross > 0 → back-facing in screen space
const cwPositions = [0, 0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 0];

const traversal = new SceneTraversal();

describe("SceneTraversal geometry", () => {
  it("Side.Front: CCW (front-facing) triangle is included in drawList", () => {
    const scene = makeScene(makeMeshNodeWithSide(ccwPositions, Side.Front));
    const result = traversal.traverse(scene, makeCamera(), 100, 100);
    expect(result).toHaveLength(1);
    expect(getFirstTriangleBufferLength(result)).toBe(1);
  });

  it("Side.Front: CW (back-facing) triangle is culled - triangle buffer empty", () => {
    const scene = makeScene(makeMeshNodeWithSide(cwPositions, Side.Front));
    const result = traversal.traverse(scene, makeCamera(), 100, 100);
    // Draw call is still created (node is visible), but backface culled
    expect(result).toHaveLength(1);
    expect(getFirstTriangleBufferLength(result)).toBe(0);
  });

  it("Side.Back: CW (back-facing) triangle is included", () => {
    const scene = makeScene(makeMeshNodeWithSide(cwPositions, Side.Back));
    const result = traversal.traverse(scene, makeCamera(), 100, 100);
    expect(result).toHaveLength(1);
    expect(getFirstTriangleBufferLength(result)).toBe(1);
  });

  it("Side.Double: both CCW and CW triangles are included", () => {
    const sceneA = makeScene(makeMeshNodeWithSide(ccwPositions, Side.Double));
    const sceneB = makeScene(makeMeshNodeWithSide(cwPositions, Side.Double));
    const resultA = traversal.traverse(sceneA, makeCamera(), 100, 100);
    const resultB = traversal.traverse(sceneB, makeCamera(), 100, 100);
    expect(getFirstTriangleBufferLength(resultA)).toBe(1);
    expect(getFirstTriangleBufferLength(resultB)).toBe(1);
  });

  it("keeps a distant sub-pixel triangle after screen-space assembly", () => {
    const width = 1140;
    const height = 966;
    const halfW = width * 0.5;
    const halfH = height * 0.5;
    const targetScreen = [
      [370.5, 555.45],
      [370.5, 555.0685587364264],
      [370.9414327202324, 555.0759438528557],
    ] as const;
    const projection = new Matrix4().makePerspective(
      Math.PI / 3,
      width / height,
      0.1,
      1000,
    );
    const projectionElements = projection.elements;
    const worldZ = -100;
    const positions = targetScreen.flatMap(([screenX, screenY]) => {
      const ndcX = screenX / halfW - 1;
      const ndcY = 1 - screenY / halfH;
      return [
        (ndcX * -worldZ) / projectionElements[0],
        (ndcY * -worldZ) / projectionElements[5],
        worldZ,
      ];
    });
    const node = makeMeshNodeWithSide(positions, Side.Double);
    const camera = {
      matrixWorldInverse: new Matrix4(),
      projectionMatrix: projection,
      position: { x: 0, y: 0, z: 0 },
    };

    const result = traversal.traverse(makeScene(node), camera, width, height);
    const triangles = defined(
      defined(result.calls[0]).triangles,
    ) as TriangleBuffer;
    expect(triangles.length).toBe(1);
    expect(triangles.screenX[0]).toBeCloseTo(targetScreen[0][0], 3);
    expect(triangles.screenY[0]).toBeCloseTo(targetScreen[0][1], 3);
    const cross =
      (triangles.screenX[1] - triangles.screenX[0]) *
        (triangles.screenY[2] - triangles.screenY[0]) -
      (triangles.screenY[1] - triangles.screenY[0]) *
        (triangles.screenX[2] - triangles.screenX[0]);
    expect(Math.abs(cross)).toBeGreaterThan(0);
  });

  it("retains coverage across adjacent projected quads", () => {
    const { node, screenGrid, indices, width, height } = makeCoverageCase();
    const result = traversal.traverse(
      makeScene(node),
      makeCamera(),
      width,
      height,
    );
    const triangles = defined(
      defined(result.calls[0]).triangles,
    ) as TriangleBuffer;
    expect(triangles.length).toBe(indices.length / 3);

    const fill = new ScanlineFill();
    const actual = new Set<string>();
    for (let i = 0; i < triangles.length; i++) {
      const offset = i * 3;
      rasterizeTriangle(
        fill,
        actual,
        [triangles.screenX[offset], triangles.screenY[offset]],
        [triangles.screenX[offset + 1], triangles.screenY[offset + 1]],
        [triangles.screenX[offset + 2], triangles.screenY[offset + 2]],
        width,
        height,
      );
    }

    const expected = new Set<string>();
    rasterizeTriangle(
      fill,
      expected,
      screenGrid[0],
      screenGrid[20],
      screenGrid[24],
      width,
      height,
    );
    rasterizeTriangle(
      fill,
      expected,
      screenGrid[0],
      screenGrid[24],
      screenGrid[4],
      width,
      height,
    );

    const missing = [...expected].filter((pixel) => !actual.has(pixel));
    expect(missing).toEqual([]);
  });

  it("Points preserve every visible vertex without triangle culling", () => {
    const result = traversal.traverse(
      makeScene(makePointsNode()),
      makeCamera(),
      100,
      100,
    );
    const triangles = defined(
      defined(result.calls[0]).triangles,
    ) as TriangleBuffer;
    expect(triangles.length).toBe(2);
    expect(Array.from(triangles.vertexIndex.slice(0, 6))).toEqual([
      0, 1, 2, 3, 3, 3,
    ]);
  });

  it("near-plane clip: vertices with w <= 0 are excluded from triangle buffer", () => {
    // Positions at z=1 → with perspective camera w = -z = -1 ≤ 0 → clipped
    const node = makeMeshNodeWithSide(
      [0, 0.5, 1, -0.5, -0.5, 1, 0.5, -0.5, 1],
      Side.Double,
    );
    const scene = makeScene(node);
    const result = traversal.traverse(scene, makePerspCamera(), 100, 100);
    expect(result).toHaveLength(1);
    expect(getFirstTriangleBufferLength(result)).toBe(0);
  });
});

function makePointsNode(): TestMeshNode {
  return {
    type: "Points",
    visible: true,
    children: [],
    matrixWorld: new Matrix4(),
    updateMatrixWorld: (): void => {
      /* no-op */
    },
    geometry: {
      getAttribute: (name: string): Attribute | undefined => {
        if (name === "position") {
          return {
            array: new Float32Array([
              -0.75, -0.75, 0, 0.75, -0.75, 0, -0.75, 0.75, 0, 0.75, 0.75, 0,
            ]),
            itemSize: 3,
          };
        }
        return undefined;
      },
      index: undefined,
    },
    material: { points: true, side: Side.Front, shading: 0 },
  };
}

type CoverageCase = {
  node: TestMeshNode;
  screenGrid: Array<[number, number]>;
  indices: number[];
  width: number;
  height: number;
};

function makeCoverageCase(): CoverageCase {
  const width = 128;
  const height = 128;
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const screenGrid: Array<[number, number]> = [];
  const positions: number[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const denominator = 1 + 0.02 * x + 0.14 * y;
      const screenX = (3 * x + y + 40) / denominator;
      const screenY = (x + 3 * y + 40) / denominator;
      screenGrid.push([screenX, screenY]);
      positions.push(screenX / halfW - 1, 1 - screenY / halfH, 0);
    }
  }

  const indices: number[] = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const i = y * 5 + x;
      indices.push(i, i + 5, i + 6, i, i + 6, i + 1);
    }
  }

  const positionData = new Float32Array(positions);
  return {
    node: {
      type: "Mesh",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      updateMatrixWorld: (): void => {
        /* no-op */
      },
      geometry: {
        getAttribute: (name: string): Attribute | undefined =>
          name === "position"
            ? { array: positionData, itemSize: 3 }
            : undefined,
        index: { array: Uint16Array.from(indices) },
      },
      material: { side: Side.Double, shading: 0 },
    },
    screenGrid,
    indices,
    width,
    height,
  };
}

function rasterizeTriangle(
  fill: ScanlineFill,
  destination: Set<string>,
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
  width: number,
  height: number,
): void {
  fill.fill(
    a[0],
    a[1],
    b[0],
    b[1],
    c[0],
    c[1],
    width,
    height,
    (y, start, end) => {
      for (let x = start; x <= end; x++) destination.add(`${x},${y}`);
    },
  );
}

// Near-plane clipping uses me[11]=-1 and me[15]=0, giving w = -z.
// Vertices at z=1 → w=-1 ≤ 0 → all three vertices clipped.
function makePerspCamera(): TraversalCamera {
  const proj = new Matrix4();
  // Column-major layout: me[11] is row3/col2 → w += -1*z; me[15]=0 eliminates constant term
  proj.elements[10] = -1;
  proj.elements[11] = -1;
  proj.elements[14] = -1;
  proj.elements[15] = 0;
  const inv = new Matrix4();
  return {
    matrixWorldInverse: inv,
    projectionMatrix: proj,
    position: { x: 0, y: 0, z: 0 },
  };
}
