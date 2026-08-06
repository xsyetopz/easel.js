import { BoxGeometry, DragControls, LambertMaterial, Mesh } from "@/index.js";
import {
  createScene,
  runLoop,
} from "../canvas/interaction/canvas_interaction_helpers.js";

export const meta = {
  id: "misc_controls_drag",
  name: "Drag Controls",
  category: "misc",
  description: "Pick and move CPU meshes across a camera-facing plane.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [0, 1, 8],
    target: [0, 0.5, 0],
  });
  const objects = [];
  for (let index = 0; index < 12; index++) {
    const mesh = new Mesh(
      new BoxGeometry(0.9, 0.9, 0.9),
      new LambertMaterial({ color: index % 2 ? 0x5b9fe0 : 0xe4b85f }),
    );
    mesh.position.set((index % 4) - 1.5, Math.floor(index / 4) - 1, 0);
    scene.add(mesh);
    objects.push(mesh);
  }
  const dragControls = new DragControls(objects, camera, canvas);
  return runLoop(renderer, scene, camera, () => dragControls.enabled, [
    () => dragControls.dispose(),
  ]);
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const controls = new EASEL.DragControls(objects, camera, renderer.domElement);
controls.addEventListener("drag", ({ object }) => object.updateMatrix());`;

export const threeSource = `import * as THREE from "three";
import { DragControls } from "three/addons/controls/DragControls.js";

const controls = new DragControls(objects, camera, renderer.domElement);
controls.addEventListener("drag", ({ object }) => object.updateMatrix());`;

export const example = { meta, controls, setup, easelSource, threeSource };
