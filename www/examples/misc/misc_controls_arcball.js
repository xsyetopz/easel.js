import {
  ArcballControls,
  BoxGeometry,
  LambertMaterial,
  Mesh,
} from "@/index.js";
import {
  createScene,
  runLoop,
} from "../canvas/interaction/canvas_interaction_helpers.js";

export const meta = {
  id: "misc_controls_arcball",
  name: "Arcball Controls",
  category: "misc",
  description: "Rotate, pan, and zoom a CPU scene with arcball controls.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [3, 2.5, 6],
    target: [0, 0, 0],
  });
  const arcball = new ArcballControls(camera, canvas);
  arcball.target.set(0, 0, 0);
  const mesh = new Mesh(
    new BoxGeometry(2, 2, 2),
    new LambertMaterial({ color: 0x5b9fe0 }),
  );
  scene.add(mesh);
  return runLoop(
    renderer,
    scene,
    camera,
    (time) => {
      mesh.rotation.y = time * 0.2;
      arcball.update();
    },
    [() => arcball.dispose()],
  );
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const controls = new EASEL.ArcballControls(camera, renderer.domElement);
controls.setGizmosVisible(true);
controls.update();`;

export const threeSource = `import * as THREE from "three";
import { ArcballControls } from "three/addons/controls/ArcballControls.js";

const controls = new ArcballControls(camera, renderer.domElement);
controls.setGizmosVisible(true);
controls.update();`;

export const example = { meta, controls, setup, easelSource, threeSource };
