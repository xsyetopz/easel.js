import {
  ConeGeometry,
  Group,
  LambertMaterial,
  Mesh,
  SphereGeometry,
  TorusKnotGeometry,
} from "@/index.js";
import { createScene, runLoop } from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_multiple_scenes_comparison",
  name: "Multiple Scenes Comparison",
  category: "canvas",
  description:
    "Three authored scene groups are composed side-by-side in one Canvas2D framebuffer; this avoids sequential clears that would hide earlier scenes.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [7.8, 4.2, 11.5],
    target: [0, 0.3, 0],
  });
  const scenes = [new Group(), new Group(), new Group()];
  const meshes = [
    new Mesh(
      new SphereGeometry(1.1, 16, 10),
      new LambertMaterial({ color: 0xe06a72 }),
    ),
    new Mesh(
      new ConeGeometry(1.15, 2.2, 16),
      new LambertMaterial({ color: 0x5da6df }),
    ),
    new Mesh(
      new TorusKnotGeometry(1, 0.24, 36, 8),
      new LambertMaterial({ color: 0x6ac18b }),
    ),
  ];
  for (let index = 0; index < scenes.length; index++) {
    scenes[index].position.x = (index - 1) * 3;
    scenes[index].add(meshes[index]);
    scene.add(scenes[index]);
  }

  return runLoop(renderer, scene, camera, (time) => {
    for (let index = 0; index < meshes.length; index++) {
      meshes[index].rotation.y = time * (0.35 + index * 0.18);
      meshes[index].rotation.x = Math.sin(time * 0.5 + index) * 0.16;
    }
  });
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const scenes = [sceneA, sceneB, sceneC];
scenes.forEach((root, index) => root.position.x = (index - 1) * 3);
mainScene.add(...scenes);
renderer.render(mainScene, camera);`;

export const threeSource = `import * as THREE from "three";

const scenes = [sceneA, sceneB, sceneC];
scenes.forEach((root, index) => root.position.x = (index - 1) * 3);
mainScene.add(...scenes);
renderer.render(mainScene, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
