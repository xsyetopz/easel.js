import { BoxGeometry, LambertMaterial, MapControls, Mesh } from "@/index.js";
import {
  createScene,
  runLoop,
} from "../canvas/interaction/canvas_interaction_helpers.js";

export const meta = {
  id: "misc_controls_map",
  name: "Map Controls",
  category: "misc",
  description: "Pan and orbit a CPU scene with map-style camera controls.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [5, 6, 8],
    target: [0, 0, 0],
  });
  const mapControls = new MapControls(camera, canvas);
  mapControls.target.set(0, 0, 0);
  mapControls.enableDamping = true;
  for (let index = 0; index < 16; index++) {
    const mesh = new Mesh(
      new BoxGeometry(0.8, 0.8 + (index % 3) * 0.4, 0.8),
      new LambertMaterial({ color: index % 2 ? 0x5b9fe0 : 0xe4b85f }),
    );
    mesh.position.set((index % 4) - 1.5, 0.4, Math.floor(index / 4) - 1.5);
    scene.add(mesh);
  }
  return runLoop(renderer, scene, camera, () => mapControls.update(), [
    () => mapControls.dispose(),
  ]);
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const controls = new EASEL.MapControls(camera, renderer.domElement);
controls.screenSpacePanning = false;
controls.update();`;

export const threeSource = `import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";

const controls = new MapControls(camera, renderer.domElement);
controls.screenSpacePanning = false;
controls.update();`;

export const example = { meta, controls, setup, easelSource, threeSource };
