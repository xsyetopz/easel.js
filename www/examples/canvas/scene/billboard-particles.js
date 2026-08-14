import {
  AmbientLight,
  DirectionalLight,
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
  id: "billboard-particles",
  name: "Billboard Particles",
  category: "materials",
  animated: true,
  description: "Render camera-facing particles for smoke, debris, or markers.",
};

export const controls = [];

function createCloud(count = 140) {
  const positions = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const radius = 2.8 * Math.sqrt(t);
    const angle = i * golden;
    positions.push(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      Math.sin(angle * 1.7) * 0.6,
    );
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
  scene.background = 0x0d1320;
  const camera = new PerspectiveCamera({
    fov: 48,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.2, 7.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.2));
  const light = new DirectionalLight(0xffffff, 0.8);
  light.position.set(3, 4, 6);
  scene.add(light);

  const cloud = new Points(
    createCloud(),
    new PointsMaterial({ color: 0x73d5ec, size: 4 }),
  );
  scene.add(cloud);
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    clock.update(timestamp);
    cloud.rotation.y += clock.delta * 0.22;
    cloud.rotation.x = Math.sin(clock.elapsedTime * 0.55) * 0.12;
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
const points = new EASEL.Points(geometry, new EASEL.PointsMaterial({ color: 0x73d5ec, size: 4 }));
scene.add(points);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
