import { describe, expect, it } from "bun:test";
import { Side } from "@/core/Constants.ts";
import { Node } from "@/core/Node.ts";
import { Scene } from "@/core/Scene.ts";
import { DirectionalLight } from "@/lights/DirectionalLight.ts";
import { HemisphereLight } from "@/lights/HemisphereLight.ts";
import { LightProbe } from "@/lights/LightProbe.ts";
import { PointLight } from "@/lights/PointLight.ts";
import { SpotLight } from "@/lights/SpotLight.ts";
import { Matrix4 } from "@/math/Matrix4.js";
import { DrawList } from "@/pipeline/DrawList.js";
import { ScanlineFill } from "@/pipeline/rasterizer/ScanlineFill.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";
import type { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";
import { defined } from "../_helpers/defined.ts";
import {
  getFirstTriangleBufferLength,
  makeTraversalCamera as makeCamera,
  makeTraversalMeshNode as makeMeshNode,
  makeTraversalScene as makeScene,
} from "../_helpers/scene-traversal.ts";

describe("SceneTraversal", () => {
  const traversal = new SceneTraversal();

  it("returns a DrawList", () => {
    const result = traversal.traverse(makeScene(), makeCamera());
    expect(result).toBeInstanceOf(DrawList);
  });

  it("empty scene produces empty DrawList", () => {
    const result = traversal.traverse(makeScene(), makeCamera());
    expect(result.length).toBe(0);
  });

  it("does not update scene matrices implicitly", () => {
    const scene = {
      visible: true,
      children: [],
      updated: false,
      updateMatrixWorld(updateParents?: boolean, updateChildren?: boolean) {
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
    expect(result.length).toBe(2);
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
    const attrs = new Map([
      [
        "position",
        {
          array: new Float32Array([0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0]),
          itemSize: 3,
        },
      ],
      ["color", { array: colors, itemSize: 3 }],
    ]);
    const node = {
      type: "Mesh",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      updateMatrixWorld: () => {
        /* no-op */
      },
      geometry: {
        getAttribute: (name: string) => attrs.get(name),
        index: { array: new Uint16Array([0, 1, 2]) },
      },
      material: { side: Side.Double, shading: 0, vertexColors: true },
    };
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
    attrs.set("color", { array: new Float32Array(12), itemSize: 4 });
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
    expect(result.length).toBe(1);
  });

  it("nested visible mesh is included", () => {
    const inner = makeMeshNode();
    const outer = { ...makeMeshNode(true), children: [inner] };
    const scene = makeScene(outer);
    const result = traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    expect(result.length).toBe(2);
  });

  // Backface culling tests
  // CCW triangle (v0 top, v1 bottom-left, v2 bottom-right) in NDC produces:
  //   with width=height=100: sx0=50,sy0=25, sx1=25,sy1=75, sx2=75,sy2=75
  //   cross = (25-50)*(75-25) - (75-25)*(75-50) = -2500 → negative → front-facing
  function makeMeshNodeWithSide(positions: ArrayLike<number>, side: number) {
    return {
      type: "Mesh",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      updateMatrixWorld: () => {
        /* no-op */
      },
      geometry: {
        getAttribute: (name: string) => {
          if (name === "position")
            return {
              array: new Float32Array(positions),
              itemSize: 3,
            };
          if (name === "normal")
            return {
              array: new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1]),
              itemSize: 3,
            };
          return null;
        },
        index: { array: new Uint16Array([0, 1, 2]) },
      },
      material: { side, shading: 0 },
    };
  }

  // CCW positions → cross < 0 → front-facing in screen space
  const ccwPositions = [0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0];
  // CW positions (v1/v2 swapped) → cross > 0 → back-facing in screen space
  const cwPositions = [0, 0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 0];

  it("Side.Front: CCW (front-facing) triangle is included in drawList", () => {
    const scene = makeScene(makeMeshNodeWithSide(ccwPositions, Side.Front));
    const result = traversal.traverse(scene, makeCamera(), 100, 100);
    expect(result.length).toBe(1);
    expect(getFirstTriangleBufferLength(result)).toBe(1);
  });

  it("Side.Front: CW (back-facing) triangle is culled - triangle buffer empty", () => {
    const scene = makeScene(makeMeshNodeWithSide(cwPositions, Side.Front));
    const result = traversal.traverse(scene, makeCamera(), 100, 100);
    // Draw call is still created (node is visible), but backface culled
    expect(result.length).toBe(1);
    expect(getFirstTriangleBufferLength(result)).toBe(0);
  });

  it("Side.Back: CW (back-facing) triangle is included", () => {
    const scene = makeScene(makeMeshNodeWithSide(cwPositions, Side.Back));
    const result = traversal.traverse(scene, makeCamera(), 100, 100);
    expect(result.length).toBe(1);
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
    const triangles = (defined(result.calls[0]).triangles ??
      null) as TriangleBuffer | null;
    expect(triangles).not.toBeNull();
    expect(triangles?.length).toBe(1);
    expect(triangles?.screenX[0]).toBeCloseTo(targetScreen[0][0], 3);
    expect(triangles?.screenY[0]).toBeCloseTo(targetScreen[0][1], 3);
    const cross =
      ((triangles?.screenX[1] ?? 0) - (triangles?.screenX[0] ?? 0)) *
        ((triangles?.screenY[2] ?? 0) - (triangles?.screenY[0] ?? 0)) -
      ((triangles?.screenY[1] ?? 0) - (triangles?.screenY[0] ?? 0)) *
        ((triangles?.screenX[2] ?? 0) - (triangles?.screenX[0] ?? 0));
    expect(Math.abs(cross)).toBeGreaterThan(0);
  });

  it("retains coverage across adjacent projected quads", () => {
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
    const node = {
      type: "Mesh",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      geometry: {
        getAttribute: (name: string) =>
          name === "position"
            ? { array: positionData, itemSize: 3 }
            : undefined,
        index: { array: Uint16Array.from(indices) },
      },
      material: { side: Side.Double, shading: 0 },
    };
    const result = traversal.traverse(
      makeScene(node),
      makeCamera(),
      width,
      height,
    );
    const triangles = defined(result.calls[0]).triangles as TriangleBuffer;
    expect(triangles.length).toBe(indices.length / 3);

    const fill = new ScanlineFill();
    const rasterize = (
      destination: Set<string>,
      a: readonly [number, number],
      b: readonly [number, number],
      c: readonly [number, number],
    ) => {
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
    };

    const actual = new Set<string>();
    for (let i = 0; i < triangles.length; i++) {
      const offset = i * 3;
      rasterize(
        actual,
        [triangles.screenX[offset], triangles.screenY[offset]],
        [triangles.screenX[offset + 1], triangles.screenY[offset + 1]],
        [triangles.screenX[offset + 2], triangles.screenY[offset + 2]],
      );
    }

    const expected = new Set<string>();
    rasterize(expected, screenGrid[0], screenGrid[20], screenGrid[24]);
    rasterize(expected, screenGrid[0], screenGrid[24], screenGrid[4]);

    const missing = [...expected].filter((pixel) => !actual.has(pixel));
    expect(missing).toEqual([]);
  });

  it("Points preserve every visible vertex without triangle culling", () => {
    const node = {
      type: "Points",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      updateMatrixWorld: () => {
        /* no-op */
      },
      geometry: {
        getAttribute: (name: string) => {
          if (name === "position") {
            return {
              array: new Float32Array([
                -0.75, -0.75, 0, 0.75, -0.75, 0, -0.75, 0.75, 0, 0.75, 0.75, 0,
              ]),
              itemSize: 3,
            };
          }
          return void 0;
        },
        index: undefined,
      },
      material: { points: true, side: Side.Front, shading: 0 },
    };

    const scene = makeScene(node as unknown as ReturnType<typeof makeMeshNode>);
    const result = traversal.traverse(scene, makeCamera(), 100, 100);
    const triangles = defined(result.calls[0]).triangles as TriangleBuffer;
    expect(triangles.length).toBe(2);
    expect(Array.from(triangles.vertexIndex.slice(0, 6))).toEqual([
      0, 1, 2, 3, 3, 3,
    ]);
  });

  // Near-plane clipping: w <= 0 causes triangle to be skipped
  // A perspective-style projection with me[11]=-1, me[15]=0 gives w = -z.
  // Vertices at z=1 → w=-1 ≤ 0 → all three vertices clipped → triangle skipped.
  function makePerspCamera() {
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
      updateMatrixWorld: () => {
        /* no-op */
      },
      position: { x: 0, y: 0, z: 0 },
    };
  }

  it("near-plane clip: vertices with w <= 0 are excluded from triangle buffer", () => {
    // Positions at z=1 → with perspective camera w = -z = -1 ≤ 0 → clipped
    const node = makeMeshNodeWithSide(
      [0, 0.5, 1, -0.5, -0.5, 1, 0.5, -0.5, 1],
      Side.Double,
    );
    const scene = makeScene(node);
    const result = traversal.traverse(scene, makePerspCamera(), 100, 100);
    expect(result.length).toBe(1);
    expect(getFirstTriangleBufferLength(result)).toBe(0);
  });

  // Light collection tests
  it("AmbientLight is collected as type 'ambient' in drawList.lights", () => {
    const light = {
      type: "AmbientLight",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      color: { r: 1, g: 1, b: 1 },
      intensity: 0.5,
    };
    const scene = makeScene(light);
    const result = traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    expect(result.lights).toHaveLength(1);
    expect(defined(result.lights[0])["type"]).toBe("ambient");
    expect(defined(result.lights[0])["intensity"]).toBe(0.5);
  });

  it("DirectionalLight is collected as type 'directional' in drawList.lights", () => {
    const light = {
      type: "DirectionalLight",
      visible: true,
      children: [],
      matrixWorld: new Matrix4().makeTranslation(0, 1, 0),
      position: { x: 0, y: 1, z: 0 },
      color: { r: 1, g: 1, b: 1 },
      intensity: 1,
    };
    const scene = makeScene(light);
    const result = traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    expect(result.lights).toHaveLength(1);
    expect(defined(result.lights[0])["type"]).toBe("directional");
  });

  it("collects LightProbe coefficients by reference for baked lighting", () => {
    const probe = new LightProbe(undefined, 0.75);
    probe.sh.coefficients[0].set(1, 0.5, 0.25);
    const scene = new Scene();
    scene.add(probe);
    scene.updateMatrixWorld(false, true);

    const result = traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    const entry = defined(result.lights[0]);
    expect(entry["type"]).toBe("probe");
    expect(entry["intensity"]).toBe(0.75);
    expect(entry["coefficients"]).toBe(probe.sh.coefficients);
  });

  it("collects translated point and spot positions from prepared world matrices", () => {
    const scene = new Scene();
    const parent = new Node();
    parent.position.set(10, 20, 30);
    const point = new PointLight();
    const spot = new SpotLight();
    parent.add(point);
    parent.add(spot);
    scene.add(parent);
    scene.updateMatrixWorld(false, true);

    scene.updateMatrixWorld = (): void => {
      throw new Error("traversal must not prepare scene matrices");
    };
    parent.updateMatrixWorld = (): void => {
      throw new Error("traversal must not prepare parent matrices");
    };
    point.updateMatrixWorld = (): void => {
      throw new Error("traversal must not prepare point matrices");
    };
    spot.updateMatrixWorld = (): void => {
      throw new Error("traversal must not prepare spot matrices");
    };

    const result = traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    const pointEntry = defined(
      result.lights.find((light) => light["type"] === "point"),
    );
    const spotEntry = defined(
      result.lights.find((light) => light["type"] === "spot"),
    );
    expect(pointEntry["position"]).toEqual({ x: 10, y: 20, z: 30 });
    expect(spotEntry["position"]).toEqual({ x: 10, y: 20, z: 30 });
    expect(spotEntry["cosAngle"]).toBe(spot.cosAngle);
    expect(spotEntry["cosInnerAngle"]).toBe(spot.cosInnerAngle);
  });

  it("uses the prepared world translation for a targetless directional light", () => {
    const scene = new Scene();
    const parent = new Node();
    parent.position.set(10, 20, 30);
    const light = new DirectionalLight();
    parent.add(light);
    scene.add(parent);
    scene.updateMatrixWorld(false, true);

    const result = traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    const direction = defined(result.lights[0])["direction"] as {
      x: number;
      y: number;
      z: number;
    };
    const length = Math.sqrt(10 * 10 + 21 * 21 + 30 * 30);
    expect(direction.x).toBeCloseTo(-10 / length, 6);
    expect(direction.y).toBeCloseTo(-21 / length, 6);
    expect(direction.z).toBeCloseTo(-30 / length, 6);
  });

  it("keeps target and fallback spot directions in prepared world space", () => {
    const scene = new Scene();
    const parent = new Node();
    parent.position.set(10, 20, 30);
    parent.rotateZ(Math.PI / 2);
    const spot = new SpotLight();
    parent.add(spot);
    scene.add(parent);
    scene.updateMatrixWorld(false, true);

    let result = traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    let direction = defined(result.lights[0])["direction"] as {
      x: number;
      y: number;
      z: number;
    };
    expect(direction.x).toBeCloseTo(1, 6);
    expect(direction.y).toBeCloseTo(0, 6);
    expect(direction.z).toBeCloseTo(0, 6);

    const targetParent = new Node();
    targetParent.position.set(40, 50, 60);
    const target = new Node();
    targetParent.add(target);
    scene.add(targetParent);
    spot.target = target;
    scene.updateMatrixWorld(false, true);

    result = traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    direction = defined(result.lights[0])["direction"] as {
      x: number;
      y: number;
      z: number;
    };
    const length = Math.sqrt(30 * 30 + 30 * 30 + 30 * 30);
    expect(direction.x).toBeCloseTo(30 / length, 6);
    expect(direction.y).toBeCloseTo(30 / length, 6);
    expect(direction.z).toBeCloseTo(30 / length, 6);
  });

  it("HemisphereLight is collected as type 'hemisphere' in drawList.lights", () => {
    const light = {
      type: "HemisphereLight",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      position: { x: 0, y: 1, z: 0 },
      color: { r: 1, g: 1, b: 1 },
      groundColor: { r: 0.2, g: 0.2, b: 0.2 },
      intensity: 1,
    };
    const scene = makeScene(light);
    const result = traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    expect(result.lights).toHaveLength(1);
    expect(defined(result.lights[0])["type"]).toBe("hemisphere");
  });

  it("collects a hemisphere direction from the prepared world translation", () => {
    const scene = new Scene();
    const parent = new Node();
    parent.rotateZ(Math.PI / 2);
    const light = new HemisphereLight();
    parent.add(light);
    scene.add(parent);
    scene.updateMatrixWorld(false, true);

    scene.updateMatrixWorld = () => {
      throw new Error("traversal must not prepare scene matrices");
    };
    parent.updateMatrixWorld = () => {
      throw new Error("traversal must not prepare parent matrices");
    };
    light.updateMatrixWorld = () => {
      throw new Error("traversal must not prepare light matrices");
    };

    const result = traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    const direction = defined(result.lights[0])["direction"] as {
      x: number;
      y: number;
      z: number;
    };
    expect(direction.x).toBeCloseTo(-1, 6);
    expect(direction.y).toBeCloseTo(0, 6);
    expect(direction.z).toBeCloseTo(0, 6);
  });

  it("normalizes translated prepared world positions for hemisphere direction", () => {
    const scene = new Scene();
    const parent = new Node();
    parent.position.set(2, 3, 4);
    const light = new HemisphereLight();
    parent.add(light);
    scene.add(parent);
    scene.updateMatrixWorld(false, true);

    const result = traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    const direction = defined(result.lights[0])["direction"] as {
      x: number;
      y: number;
      z: number;
    };
    const length = Math.sqrt(2 * 2 + 4 * 4 + 4 * 4);
    expect(direction.x).toBeCloseTo(2 / length, 6);
    expect(direction.y).toBeCloseTo(4 / length, 6);
    expect(direction.z).toBeCloseTo(4 / length, 6);
  });

  // Non-indexed geometry: sequential indices generated and cached on geometry
  it("non-indexed geometry generates _sequentialIndices on the geometry object", () => {
    const geometry = {
      getAttribute: (name: string) => {
        if (name === "position")
          return {
            array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
            itemSize: 3,
          };
        return null;
      },
      index: undefined,
    };
    const node = {
      type: "Mesh",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      updateMatrixWorld: () => {
        /* no-op */
      },
      geometry,
      material: { side: Side.Double, shading: 0 },
    };
    const scene = makeScene(node);
    traversal.traverse(scene, makeCamera(), 100, 100);
    expect(
      (geometry as unknown as { _sequentialIndices: Uint32Array })
        ._sequentialIndices,
    ).toBeInstanceOf(Uint32Array);
    expect(
      (geometry as unknown as { _sequentialIndices: Uint32Array })
        ._sequentialIndices.length,
    ).toBe(3);
    expect(
      Array.from(
        (geometry as unknown as { _sequentialIndices: Uint32Array })
          ._sequentialIndices,
      ),
    ).toEqual([0, 1, 2]);
  });

  it("does not update visible mesh matrices implicitly", () => {
    let called = false;
    const mesh = makeMeshNode();
    mesh.updateMatrixWorld = () => {
      called = true;
    };
    const scene = makeScene(mesh);
    traversal.traverse(
      scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
      makeCamera(),
    );
    expect(called).toBe(false);
  });

  // UV caching: _uvCache is built on first traversal and reused on second
  it("second traversal reuses _uvCache - same Float32Array reference", () => {
    const geometry = {
      getAttribute: (name: string) => {
        if (name === "position")
          return {
            array: new Float32Array(ccwPositions),
            itemSize: 3,
          };
        if (name === "uv")
          return {
            array: new Float32Array([0, 0, 1, 0, 0.5, 1]),
            itemSize: 2,
          };
        return null;
      },
      index: { array: new Uint16Array([0, 1, 2]) },
    };
    const node = {
      type: "Mesh",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      updateMatrixWorld: () => {
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
});
