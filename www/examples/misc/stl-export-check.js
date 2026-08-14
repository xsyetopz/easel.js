import {
  AmbientLight,
  BoxGeometry,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  STLExporter,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../runtime/example-animation.ts";

export const meta = {
  id: "stl-export-check",
  name: "STL Export Check",
  category: "data",
  animated: true,
  description: "Write a watertight mesh as STL for fabrication workflows.",
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
  camera.position.set(0, 0, 4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.7));
  const mesh = new Mesh(
    new BoxGeometry(1.8, 1.8, 1.8),
    new LambertMaterial({ color: 0xe5a353 }),
  );
  scene.add(mesh);
  const exported = new STLExporter().parse(mesh, "EASELBox");
  mesh.userData.exportedLength = exported.length;
  const timer = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    mesh.rotation.y += timer.update().delta * 0.4;
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
const exporter = new EASEL.STLExporter();
const text = exporter.parse(scene, "EASELBox");`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
