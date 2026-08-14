import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PLYLoader,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "scan-mesh-review",
  name: "Scan Mesh Review",
  category: "assets",
  animated: true,
  description: "Inspect a PLY scan with its authored vertex data.",
};
export const controls = [];

const source = `ply
format ascii 1.0
element vertex 4
property float x
property float y
property float z
element face 1
property list uchar int vertex_indices
end_header
-1 -1 0
1 -1 0
1 1 0
-1 1 0
4 0 1 2 3`;

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
  const mesh = new Mesh(
    new PLYLoader().parse(source),
    new LambertMaterial({ color: 0x63c2d8 }),
  );
  scene.add(mesh);
  const timer = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    mesh.rotation.y += timer.update().delta * 0.35;
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
import { PLYLoader } from "@xsyetopz/easel";
const geometry = new PLYLoader().parse(data);
const mesh = new EASEL.Mesh(geometry, material);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
