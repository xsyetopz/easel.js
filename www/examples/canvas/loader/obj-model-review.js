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

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "obj-model-review",
  name: "OBJ Model Review",
  category: "assets",
  animated: true,
  description: "Open an OBJ model for a quick browser-side mesh check.",
};
export const controls = [];

const source = `o Triangle
v 0 1 0
v -1 -1 0
v 1 -1 0
vn 0 0 1
f 1//1 2//1 3//1`;

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
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.3));
  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(2, 3, 4);
  scene.add(light);
  const loaded = new OBJLoader().parse(source);
  for (const child of loaded.children) {
    if (child instanceof Mesh)
      child.material = new LambertMaterial({ color: 0x66b7f0 });
  }
  scene.add(loaded);
  const timer = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
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
const group = new EASEL.OBJLoader().parse(text);
scene.add(group);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
