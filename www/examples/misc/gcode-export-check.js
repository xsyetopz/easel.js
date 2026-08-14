import {
  AmbientLight,
  BoxGeometry,
  GCodeExporter,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../runtime/example-animation.ts";

export const meta = {
  id: "gcode-export-check",
  name: "G-code Export Check",
  category: "data",
  animated: true,
  description: "Generate a compact toolpath from scene geometry for review.",
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
    new LambertMaterial({ color: 0x85d1a7 }),
  );
  scene.add(mesh);
  const gcode = new GCodeExporter().parse(mesh, {
    layerHeight: 0.25,
    extrusionPerUnit: 0.04,
  });
  mesh.userData.exportedLength = gcode.length;
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
const exporter = new EASEL.GCodeExporter();
const text = exporter.parse(scene, { layerHeight: 0.2 });`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
