import { BoxGeometry, FlyControls, LambertMaterial, Mesh } from "@/index.js";
import {
  createScene,
  runLoop,
} from "../canvas/interaction/canvas_interaction_helpers.js";

export const meta = {
  id: "first-person-walkthrough",
  name: "First-Person Walkthrough",
  category: "interaction",
  description: "Walk through a small scene with keyboard-look controls.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [0, 2, 8],
    target: [0, 1, 0],
  });
  const fly = new FlyControls(camera, canvas);
  fly.movementSpeed = 3;
  fly.rollSpeed = 0.7;
  for (let index = 0; index < 24; index++) {
    const mesh = new Mesh(
      new BoxGeometry(0.8, 0.8, 0.8),
      new LambertMaterial({ color: index % 2 ? 0x5b9fe0 : 0xe4b85f }),
    );
    mesh.position.set(
      (index % 6) - 2.5,
      Math.floor(index / 6) * 0.7,
      -Math.floor(index / 6) * 2,
    );
    scene.add(mesh);
  }
  return runLoop(renderer, scene, camera, (_time, delta) => fly.update(delta), [
    () => fly.dispose(),
  ]);
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const controls = new EASEL.FlyControls(camera, renderer.domElement);
controls.movementSpeed = 3;
controls.rollSpeed = 0.7;
controls.update(delta);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
