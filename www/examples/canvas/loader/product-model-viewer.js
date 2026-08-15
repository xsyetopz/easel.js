import {
  AmbientLight,
  GLTFLoader,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import boxGltf from "../../../../fixtures/models/box/Box.gltf?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "product-model-viewer",
  name: "Product Model Viewer",
  category: "assets",
  animated: true,
  description:
    "Frame the canonical Khronos Box glTF asset with fixed camera lighting.",
};
export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0, 4);
  camera.updateMatrixWorld(false, false, true);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrix();
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const result = new GLTFLoader().parse(JSON.parse(boxGltf), {
    materialType: "lambert",
  });
  scene.add(result.scene);
  const timer = new Timer();
  const animation = createExampleAnimationLoop(() => {
    result.scene.rotation.y += timer.update().delta * 0.35;
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
const result = new EASEL.GLTFLoader().parse(document);
scene.add(result.scene);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
