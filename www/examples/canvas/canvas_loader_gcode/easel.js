import {
  GCodeLoader,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  Vector3,
} from "@/index.js";

import testM82 from "../../../../assets/gcode/test_m82.gcode?raw";
import testM83 from "../../../../assets/gcode/test_m83.gcode?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

const sources = { test_m82: testM82, test_m83: testM83 };

export const meta = {
  id: "canvas_loader_gcode",
  upstream: "webgl_loader_gcode",
  name: "loader / gcode",
  category: "canvas",
  animated: true,
  description:
    "Parse 3D-printer G-code with GCodeLoader and draw extrusion and travel moves as colored line segments.",
  differences: [
    "The default asset is test_m82 and the asset selector offers only test_m82 and test_m83; benchy.gcode (3DBenchy) is omitted because its license is unclear.",
  ],
};
/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "asset",
    label: "asset",
    options: ["test_m82", "test_m83"],
    default: "test_m82",
  },
];

export function setup(canvas, params) {
  let model;

  let asset = String(params.asset ?? "test_m82");

  const assets = ["test_m82", "test_m83"];

  const positions = [new Vector3(0, 0, 0), new Vector3(0, 0, 0)];

  const camera = new PerspectiveCamera({
    fov: 60,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1000,
  });
  camera.position.set(0, 0, 70);

  const scene = new Scene();

  const loader = new GCodeLoader();

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const orbit = new OrbitControls(camera, canvas);
  orbit.minDistance = 10;
  orbit.maxDistance = 100;

  function disposeModel() {
    model.traverse((object) => {
      if (object.material) object.material.dispose();
      if (object.geometry) object.geometry.dispose();
    });

    scene.remove(model);
  }

  function loadAsset(name) {
    const object = loader.parse(sources[name]);
    model = object;
    model.position.copy(positions[assets.indexOf(name)]);
    scene.add(model);
    orbit.reset();
  }

  loadAsset(asset);

  const animation = createExampleAnimationLoop(() => {
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    update(next) {
      const value = String(next.asset ?? "test_m82");
      if (value === asset) return;
      asset = value;
      if (model) disposeModel();
      loadAsset(value);
    },
    cleanup() {
      animation.cleanup();
      orbit.dispose();
      if (model) disposeModel();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const loader = new EASEL.GCodeLoader();
const model = loader.parse(gcodeText);
model.position.set(0, 0, 0);
scene.add(model);

const orbit = new EASEL.OrbitControls(camera, canvas);
orbit.minDistance = 10;
orbit.maxDistance = 100;
orbit.reset();`;

export const example = { meta, controls, setup, easelSource };
