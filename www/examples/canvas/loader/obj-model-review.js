import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  OBJLoader,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import suzanneObj from "../../../../fixtures/models/suzanne/suzanne.obj?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "obj-model-review",
  name: "OBJ Asset Import",
  category: "assets",
  animated: true,
  description:
    "Load the canonical Suzanne test model from a Wavefront OBJ file.",
};
export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x121826;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0, 4.4);
  camera.updateMatrixWorld(false, false, true);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrix();
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.3));
  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(2, 3, 4);
  scene.add(light);
  const loaded = new OBJLoader().parse(suzanneObj);
  for (const child of loaded.children) {
    if (child instanceof Mesh)
      child.material = new LambertMaterial({ color: 0x68a7c7 });
  }
  scene.add(loaded);
  const timer = new Timer();
  const animation = createExampleAnimationLoop(() => {
    loaded.rotation.y += timer.update().delta * 0.35;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
import { OBJLoader } from "@xsyetopz/easel";
const loader = new EASEL.OBJLoader();
loader.load("/models/suzanne.obj", (group) => {
  scene.add(group);
});`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
