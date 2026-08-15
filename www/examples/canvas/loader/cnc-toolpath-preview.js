import {
  GCodeLoader,
  OrbitControls,
  OrthographicCamera,
  Renderer,
  Scene,
  Vector3,
} from "@/index.js";

import source from "../../../../assets/gcode/Circle_Diamond_Square_Calibration.gcode?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "cnc-toolpath-preview",
  name: "CNC Toolpath Preview",
  category: "data",
  animated: true,
  description:
    "Separate G0 travel moves from G1 cuts in a real calibration program.",
};
export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x121826;
  const aspect = width / height;
  const camera = new OrthographicCamera({
    left: -40 * aspect,
    right: 40 * aspect,
    top: 40,
    bottom: -40,
    near: 0.1,
    far: 100,
  });
  camera.position.set(35, 55, 35);
  camera.lookAt(new Vector3());
  camera.updateMatrixWorld(false, false, true);
  const renderer = new Renderer({ canvas, width, height });
  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(0, 0, 0);
  orbit.enableRotate = false;
  orbit.screenSpacePanning = false;
  orbit.minZoom = 0.65;
  orbit.maxZoom = 4;
  const loader = new GCodeLoader();
  loader.mode = "toolpath";
  const model = loader.parse(source);
  scene.add(model);
  const animation = createExampleAnimationLoop(() => {
    orbit.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      orbit.dispose();
      for (const child of model.children) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const loader = new EASEL.GCodeLoader();
loader.mode = "toolpath";
const model = loader.parse(gcodeText);
scene.add(model);`;
export const example = { meta, controls, setup, easelSource };
