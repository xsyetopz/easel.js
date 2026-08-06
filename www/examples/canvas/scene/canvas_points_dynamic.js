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

export const meta = {
  id: "webgl_points_dynamic",
  name: "Dynamic Points",
  category: "canvas",
  description:
    "A CPU position attribute is rewritten each frame to show a dynamic point cloud without GPU buffer updates.",
};

export const controls = [];

function createDynamicGeometry(count = 180) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 1.2 + (i % 17) * 0.06;
    positions.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
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
  scene.background = 0x101522;
  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 2.1, 6.2);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.2));

  const geometry = createDynamicGeometry();
  const points = new Points(
    geometry,
    new PointsMaterial({ color: 0xf0b85a, size: 3 }),
  );
  scene.add(points);
  const position = geometry.getAttribute("position");
  const clock = new Timer();
  let animationFrame;
  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    if (position) {
      for (let i = 0; i < position.count; i++) {
        const angle = (i / position.count) * Math.PI * 2;
        const radius = 1.2 + (i % 17) * 0.06;
        const wave = Math.sin(clock.elapsedTime * 2.2 + angle * 5) * 0.35;
        position.setXYZ(
          i,
          Math.cos(angle) * (radius + wave * 0.2),
          wave,
          Math.sin(angle) * (radius + wave * 0.2),
        );
      }
      position.needsUpdate = true;
      geometry.computeBoundingSphere();
    }
    points.rotation.y += clock.delta * 0.18;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

position.setXYZ(index, x, y, z);
position.needsUpdate = true;
geometry.computeBoundingSphere();`;

export const threeSource = `import * as THREE from "three";

position.setXYZ(index, x, y, z);
position.needsUpdate = true;
geometry.computeBoundingSphere();
const points = new THREE.Points(geometry, material);
scene.add(points);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
