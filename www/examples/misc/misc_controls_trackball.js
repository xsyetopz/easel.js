import {
  BoxGeometry,
  LambertMaterial,
  Mesh,
  TrackballControls,
} from "@/index.js";
import {
  createScene,
  runLoop,
} from "../canvas/interaction/canvas_interaction_helpers.js";

export const meta = {
  id: "misc_controls_trackball",
  name: "Trackball Controls",
  category: "misc",
  description: "Rotate, pan, and zoom a CPU scene with trackball controls.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [4, 3, 7],
    target: [0, 0, 0],
  });
  const trackball = new TrackballControls(camera, canvas);
  trackball.target.set(0, 0, 0);
  trackball.staticMoving = false;
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
      trackball.update();
    },
    [() => trackball.dispose()],
  );
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const controls = new EASEL.TrackballControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();`;

export const threeSource = `import * as THREE from "three";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";

const controls = new TrackballControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();`;

export const example = { meta, controls, setup, easelSource, threeSource };
