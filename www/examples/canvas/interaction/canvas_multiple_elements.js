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
  id: "webgl_multiple_elements",
  name: "Multiple Elements",
  category: "canvas",
  description:
    "Several independent scene elements share one CPU renderer and animate at different rates, replacing a multi-canvas WebGL showcase.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [5.5, 3.5, 9],
    target: [0, 0.4, 0],
  });
  const group = new Group();
  scene.add(group);
  const elements = [
    new Mesh(
      new TorusKnotGeometry(1, 0.25, 40, 8),
      new LambertMaterial({ color: 0xd9636c }),
    ),
    new Mesh(
      new ConeGeometry(1.1, 2, 16),
      new LambertMaterial({ color: 0x5ea8df }),
    ),
    new Mesh(
      new SphereGeometry(1.1, 16, 10),
      new LambertMaterial({ color: 0x6fc08b }),
    ),
  ];
  elements[0].position.x = -2.5;
  elements[1].position.y = 0.2;
  elements[2].position.x = 2.5;
  group.add(...elements);

  return runLoop(renderer, scene, camera, (time) => {
    group.rotation.y = time * 0.22;
    elements[0].rotation.x = time * 0.9;
    elements[1].rotation.z = Math.sin(time) * 0.25;
    elements[2].rotation.y = -time * 0.7;
  });
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const group = new EASEL.Group();
group.add(torus, cone, sphere);
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";

const group = new THREE.Group();
group.add(torus, cone, sphere);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
