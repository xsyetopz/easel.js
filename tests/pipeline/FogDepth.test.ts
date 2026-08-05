import { describe, expect, it } from "bun:test";
import { Side } from "@/core/Constants.ts";
import { Matrix4 } from "@/math/Matrix4.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";
import type { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";
import { Fog, FogMode } from "@/scenes/Fog.js";
import { defined } from "../_helpers/defined.js";
import { makeTraversalScene as makeScene } from "../_helpers/scene-traversal.js";

describe("SceneTraversal fog depth", () => {
  const traversal = new SceneTraversal();

  function makeFogNode(positions: ArrayLike<number>) {
    return {
      type: "Mesh",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      geometry: {
        getAttribute: (name: string) =>
          name === "position"
            ? { array: new Float32Array(positions), itemSize: 3 }
            : null,
        index: { array: new Uint16Array([0, 1, 2]) },
      },
      material: { side: Side.Double, shading: 0 },
    };
  }

  function makeFogCamera(
    projectionMatrix: Matrix4,
    matrixWorldInverse = new Matrix4(),
    position = { x: 0, y: 0, z: 0 },
  ) {
    return { matrixWorldInverse, projectionMatrix, position };
  }

  function fogFactors(
    node: unknown,
    fog: Fog,
    camera: ReturnType<typeof makeFogCamera>,
  ): number[] {
    const scene = makeScene(node) as Parameters<SceneTraversal["traverse"]>[0];
    scene.fog = fog;
    const result = traversal.traverse(scene, camera, 100, 100);
    const triangles = defined(result.calls[0]).triangles as TriangleBuffer;
    return Array.from(triangles.fogFactor.subarray(0, 3));
  }

  it("uses positive camera-space depth for perspective fog", () => {
    const projection = new Matrix4().makePerspective(Math.PI / 3, 1, 0.1, 100);
    const fog = new Fog({ near: 0, far: 20 });
    const factors = fogFactors(
      makeFogNode([-0.5, -0.5, -5, 0.5, -0.5, -10, 0, 0.5, -15]),
      fog,
      makeFogCamera(projection),
    );
    expect(factors[0]).toBeCloseTo(0.25, 3);
    expect(factors[1]).toBeCloseTo(0.5, 3);
    expect(factors[2]).toBeCloseTo(0.75, 3);
  });

  it("uses camera-space depth for orthographic fog instead of clip W", () => {
    const projection = new Matrix4().makeOrthographic(-2, 2, 2, -2, 0.1, 100);
    const fog = new Fog({ near: 0, far: 20 });
    const factors = fogFactors(
      makeFogNode([-0.5, -0.5, -5, 0.5, -0.5, -10, 0, 0.5, -15]),
      fog,
      makeFogCamera(projection),
    );
    expect(factors[0]).toBeCloseTo(0.25, 3);
    expect(factors[1]).toBeCloseTo(0.5, 3);
    expect(factors[2]).toBeCloseTo(0.75, 3);
  });

  it("accounts for translated and rotated camera view matrices", () => {
    const projection = new Matrix4().makeOrthographic(-2, 2, 2, -2, 0.1, 100);
    const fog = new Fog({ near: 0, far: 20 });
    const translated = fogFactors(
      makeFogNode([-0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0]),
      fog,
      makeFogCamera(projection, new Matrix4().makeTranslation(0, 0, -5), {
        x: 0,
        y: 0,
        z: 5,
      }),
    );
    expect(translated.every((value) => value)).toBe(true);
    expect(translated[0]).toBeCloseTo(0.25, 3);

    const rotated = fogFactors(
      makeFogNode([10, -0.5, -0.5, 10, 0.5, -0.5, 10, 0, 0.5]),
      fog,
      makeFogCamera(projection, new Matrix4().makeRotationY(Math.PI / 2)),
    );
    expect(rotated.every((value) => value)).toBe(true);
    expect(rotated[0]).toBeCloseTo(0.5, 3);
  });

  it("matches the exponential-squared fog LUT at camera-space depths", () => {
    const projection = new Matrix4().makeOrthographic(-2, 2, 2, -2, 0.1, 100);
    const density = 0.01;
    const fog = new Fog({
      far: 100,
      mode: FogMode.ExponentialSquared,
      density,
    });
    const factors = fogFactors(
      makeFogNode([-0.5, -0.5, -10, 0.5, -0.5, -20, 0, 0.5, -30]),
      fog,
      makeFogCamera(projection),
    );
    for (const [index, depth] of [10, 20, 30].entries()) {
      const expected = 1 - Math.exp(-((density * depth) ** 2));
      expect(factors[index]).toBeCloseTo(expected, 3);
    }
  });

  it("uses the same camera-space depth path for instanced meshes", () => {
    const projection = new Matrix4().makeOrthographic(-2, 2, 2, -2, 0.1, 100);
    const node = {
      type: "InstancedMesh",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      geometry: {
        getAttribute: (name: string) =>
          name === "position"
            ? {
                array: new Float32Array([
                  -0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0,
                ]),
                itemSize: 3,
              }
            : null,
        index: { array: new Uint16Array([0, 1, 2]) },
      },
      material: { side: Side.Double, shading: 0 },
      instanceMatrix: new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -10, 1,
      ]),
      instanceColor: undefined,
      count: 1,
      frustumCulled: false,
    };
    const fog = new Fog({ near: 0, far: 20 });
    const factors = fogFactors(node, fog, makeFogCamera(projection));
    expect(factors[0]).toBeCloseTo(0.5, 3);
    expect(factors[1]).toBeCloseTo(0.5, 3);
    expect(factors[2]).toBeCloseTo(0.5, 3);
  });
});
