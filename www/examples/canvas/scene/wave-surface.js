import {
  AmbientLight,
  Geometry,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "wave-surface",
  name: "Wave Surface",
  category: "materials",
  animated: true,
  description: "Inspect a moving water surface built from sampled points.",
};

export const controls = [];

function waveGeometry(columns = 28, rows = 18) {
  const positions = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = (column / (columns - 1) - 0.5) * 6;
      const z = (row / (rows - 1) - 0.5) * 4;
      positions.push(x, 0, z);
    }
  }
  const geometry = new Geometry();
  geometry.setPositions(positions);
  geometry.computeBoundingSphere();
  return geometry;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x0a1624;
  const camera = new PerspectiveCamera({
    fov: 48,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 4.6, 7.8);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.18));

  const columns = 28;
  const rows = 18;
  const geometry = waveGeometry(columns, rows);
  const points = new Points(
    geometry,
    new PointsMaterial({ color: 0x59c5d6, size: 3 }),
  );
  scene.add(points);
  const position = geometry.getAttribute("position");
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    clock.update(timestamp);
    if (position) {
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const index = row * columns + column;
          const x = (column / (columns - 1) - 0.5) * 6;
          const z = (row / (rows - 1) - 0.5) * 4;
          const y =
            Math.sin(x * 1.6 + clock.elapsedTime * 1.6) * 0.22 +
            Math.cos(z * 2.1 - clock.elapsedTime * 1.2) * 0.18;
          position.setXYZ(index, x, y, z);
        }
      }
      position.needsUpdate = true;
      geometry.computeBoundingSphere();
    }
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
for (const vertex of vertices) position.setXYZ(vertex, x, wave, z);
position.needsUpdate = true;`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
