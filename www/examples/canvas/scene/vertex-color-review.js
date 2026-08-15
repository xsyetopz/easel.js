import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { aimCamera } from "../../../runtime/example-camera.ts";

export const meta = {
  id: "vertex-color-review",
  name: "Vertex Color Review",
  category: "materials",
  animated: true,
  description: "Authored vertex colors remain visible on a lit mesh.",
};

export const controls = [];

function createVertexColorCube(size = 2.5) {
  const geometry = new BoxGeometry(size, size, size);
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);

  for (let vertex = 0; vertex < position.count; vertex++) {
    const offset = vertex * 3;
    colors[offset] = 0.35 + 0.65 * (position.getX(vertex) / size + 0.5);
    colors[offset + 1] = 0.35 + 0.65 * (position.getY(vertex) / size + 0.5);
    colors[offset + 2] = 0.35 + 0.65 * (position.getZ(vertex) / size + 0.5);
  }

  geometry.setColors(colors);
  geometry.computeBoundingSphere();
  return geometry;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101522;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1, 5.5);
  aimCamera(camera, new Vector3());
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.65));
  const key = new DirectionalLight(0xffffff, 0.85);
  key.position.set(3, 4, 5);
  scene.add(key);

  const geometry = createVertexColorCube();
  const material = new LambertMaterial({
    color: 0xffffff,
    vertexColors: true,
  });
  const cube = new Mesh(geometry, material);
  scene.add(cube);
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    clock.update(timestamp);
    cube.rotation.x += clock.delta * 0.35;
    cube.rotation.y += clock.delta * 0.55;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      clock.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const geometry = new EASEL.BoxGeometry(2.5, 2.5, 2.5);
const position = geometry.getAttribute("position");
const colors = new Float32Array(position.count * 3);
for (let vertex = 0; vertex < position.count; vertex++) {
  const offset = vertex * 3;
  colors[offset] = 0.35 + 0.65 * (position.getX(vertex) / 2.5 + 0.5);
  colors[offset + 1] = 0.35 + 0.65 * (position.getY(vertex) / 2.5 + 0.5);
  colors[offset + 2] = 0.35 + 0.65 * (position.getZ(vertex) / 2.5 + 0.5);
}
geometry.setColors(colors);

const material = new EASEL.LambertMaterial({ color: 0xffffff, vertexColors: true });
const mesh = new EASEL.Mesh(geometry, material);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
