import {
  AmbientLight,
  BoxGeometry,
  LambertMaterial,
  Mesh,
  OBJExporter,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../runtime/example-animation.ts";

export const meta = {
  id: "obj-export-check",
  name: "OBJ Export Check",
  category: "data",
  animated: true,
  description: "A rotating mesh supplies geometry to an OBJ export call.",
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
  camera.updateMatrixWorld(false, false, true);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrix();
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.7));
  const mesh = new Mesh(
    new BoxGeometry(1.8, 1.8, 1.8),
    new LambertMaterial({ color: 0x5da9e9 }),
  );
  scene.add(mesh);
  const exported = new OBJExporter().parse(mesh);
  mesh.userData.exportedLength = exported.length;
  const timer = new Timer();
  const animation = createExampleAnimationLoop(() => {
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

const exporter = new EASEL.OBJExporter();
const exported = exporter.parse(mesh);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
