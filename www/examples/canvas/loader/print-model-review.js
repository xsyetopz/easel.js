import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  STLLoader,
  Timer,
  Vector3,
} from "@/index.js";

import source from "../../../../assets/stl/slotted_disk.stl?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { aimCamera } from "../../../runtime/example-camera.ts";

export const meta = {
  id: "print-model-review",
  name: "Print Model Review",
  category: "assets",
  animated: true,
  description:
    "Check the surface and slot of a triangulated STL disk before slicing.",
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
    far: 100,
  });
  camera.position.set(0, 1.4, 5.5);
  aimCamera(camera, new Vector3());
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.3));
  const light = new DirectionalLight(0xffffff, 1.2);
  light.position.set(3, 4, 5);
  scene.add(light);
  const geometry = new STLLoader().parse(source);
  geometry.center();
  const material = new LambertMaterial({ color: 0xedaa59 });
  const mesh = new Mesh(geometry, material);
  mesh.scale.setScalar(3);
  mesh.rotation.x = -0.55;
  scene.add(mesh);
  const timer = new Timer();
  const animation = createExampleAnimationLoop(() => {
    mesh.rotation.y += timer.update().delta * 0.16;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const geometry = new EASEL.STLLoader().parse(stlText);
geometry.center();
const mesh = new EASEL.Mesh(geometry, material);`;
export const example = { meta, controls, setup, easelSource };
