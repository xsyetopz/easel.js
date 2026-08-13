import { expect, it } from "bun:test";
import { Node } from "@/core/Node.ts";
import { Scene } from "@/core/Scene.ts";
import { DirectionalLight } from "@/lights/DirectionalLight.ts";
import { HemisphereLight } from "@/lights/HemisphereLight.ts";
import { LightProbe } from "@/lights/LightProbe.ts";
import { PointLight } from "@/lights/PointLight.ts";
import { SpotLight } from "@/lights/SpotLight.ts";
import { Matrix4 } from "@/math/Matrix4.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";
import { defined } from "../_helpers/defined.ts";
import {
  makeTraversalCamera as makeCamera,
  makeTraversalScene as makeScene,
} from "../_helpers/scene-traversal.ts";

type LightDirection = {
  x: number;
  y: number;
  z: number;
};

const traversal = new SceneTraversal();

type TraversalScene = Parameters<SceneTraversal["traverse"]>[0];

type LightEntry = Record<string, unknown> & {
  type: string;
  intensity?: number;
  coefficients?: unknown;
  position?: LightDirection;
  cosAngle?: number;
  cosInnerAngle?: number;
  direction?: LightDirection;
};

function traverseScene(
  scene: Scene | TraversalScene,
): ReturnType<SceneTraversal["traverse"]> {
  return traversal.traverse(scene as unknown as TraversalScene, makeCamera());
}

function lightEntry(value: Record<string, unknown> | undefined): LightEntry {
  return defined(value) as LightEntry;
}

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
  const result = traverseScene(scene);
  expect(result.lights).toHaveLength(1);
  expect(lightEntry(result.lights[0]).type).toBe("ambient");
  expect(lightEntry(result.lights[0]).intensity).toBe(0.5);
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
  const result = traverseScene(scene);
  expect(result.lights).toHaveLength(1);
  expect(lightEntry(result.lights[0]).type).toBe("directional");
});

it("collects LightProbe coefficients by reference for baked lighting", () => {
  const probe = new LightProbe(undefined, 0.75);
  probe.sh.coefficients[0].set(1, 0.5, 0.25);
  const scene = new Scene();
  scene.add(probe);
  scene.updateMatrixWorld(false, true);

  const result = traverseScene(scene);
  const entry = lightEntry(result.lights[0]);
  expect(entry.type).toBe("probe");
  expect(entry.intensity).toBe(0.75);
  expect(entry.coefficients).toBe(probe.sh.coefficients);
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

  const result = traverseScene(scene);
  const pointEntry = lightEntry(
    result.lights.find((light) => lightEntry(light).type === "point"),
  );
  const spotEntry = lightEntry(
    result.lights.find((light) => lightEntry(light).type === "spot"),
  );
  expect(pointEntry.position).toEqual({ x: 10, y: 20, z: 30 });
  expect(spotEntry.position).toEqual({ x: 10, y: 20, z: 30 });
  expect(spotEntry.cosAngle).toBe(spot.cosAngle);
  expect(spotEntry.cosInnerAngle).toBe(spot.cosInnerAngle);
});

it("uses the prepared world translation for a targetless directional light", () => {
  const scene = new Scene();
  const parent = new Node();
  parent.position.set(10, 20, 30);
  const light = new DirectionalLight();
  parent.add(light);
  scene.add(parent);
  scene.updateMatrixWorld(false, true);

  const result = traverseScene(scene);
  const direction = lightEntry(result.lights[0]).direction as LightDirection;
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

  let result = traverseScene(scene);
  let direction = lightEntry(result.lights[0]).direction as LightDirection;
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

  result = traverseScene(scene);
  direction = lightEntry(result.lights[0]).direction as LightDirection;
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
  const result = traverseScene(scene);
  expect(result.lights).toHaveLength(1);
  expect(lightEntry(result.lights[0]).type).toBe("hemisphere");
});

it("collects a hemisphere direction from the prepared world translation", () => {
  const scene = new Scene();
  const parent = new Node();
  parent.rotateZ(Math.PI / 2);
  const light = new HemisphereLight();
  parent.add(light);
  scene.add(parent);
  scene.updateMatrixWorld(false, true);

  scene.updateMatrixWorld = (): void => {
    throw new Error("traversal must not prepare scene matrices");
  };
  parent.updateMatrixWorld = (): void => {
    throw new Error("traversal must not prepare parent matrices");
  };
  light.updateMatrixWorld = (): void => {
    throw new Error("traversal must not prepare light matrices");
  };

  const result = traverseScene(scene);
  const direction = lightEntry(result.lights[0]).direction as LightDirection;
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

  const result = traverseScene(scene);
  const direction = lightEntry(result.lights[0]).direction as LightDirection;
  const length = Math.sqrt(2 * 2 + 4 * 4 + 4 * 4);
  expect(direction.x).toBeCloseTo(2 / length, 6);
  expect(direction.y).toBeCloseTo(4 / length, 6);
  expect(direction.z).toBeCloseTo(4 / length, 6);
});
