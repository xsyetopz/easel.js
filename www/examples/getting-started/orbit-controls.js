import * as EASEL from "@/index.js";

export const meta = {
  id: "orbit-controls",
  name: "Orbit Controls",
  category: "getting-started",
  description: "Click and drag to orbit, scroll to zoom.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;

  const scene = new EASEL.Scene();
  const camera = new EASEL.PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(4, 3, 6);

  const renderer = new EASEL.Renderer({ canvas, width, height });
  const orbitControls = new EASEL.OrbitControls(camera, canvas);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.12;

  scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
  const light = new EASEL.DirectionalLight(0xffffff, 0.8);
  light.position.set(5, 8, 5);
  scene.add(light);

  const sphere = new EASEL.Mesh(
    new EASEL.SphereGeometry(1, 20, 14),
    new EASEL.LambertMaterial({ color: 0x44aa88 }),
  );
  scene.add(sphere);

  const box = new EASEL.Mesh(
    new EASEL.BoxGeometry(0.8, 0.8, 0.8),
    new EASEL.LambertMaterial({ color: 0xaa4488 }),
  );
  box.position.set(2.5, 0, 0);
  scene.add(box);

  const cone = new EASEL.Mesh(
    new EASEL.ConeGeometry(0.6, 1.2, 12),
    new EASEL.LambertMaterial({ color: 0x4488aa }),
  );
  cone.position.set(-2.5, 0, 0);
  scene.add(cone);

  const clock = new EASEL.Timer();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    void clock.update().delta;
    orbitControls.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
      orbitControls.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const camera = new EASEL.PerspectiveCamera({
  fov: 45,
  aspect: width / height,
});
camera.position.set(4, 3, 6);

const renderer = new EASEL.Renderer({ canvas, width, height });

const controls = new EASEL.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.12;

const sphere = new EASEL.Mesh(
  new EASEL.SphereGeometry(1, 20, 14),
  new EASEL.LambertMaterial({ color: 0x44aa88 }),
);
scene.add(sphere);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
}
animate();`;

export const threeSource = `import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const camera = new THREE.PerspectiveCamera(
  45, width / height, 0.1, 100,
);
camera.position.set(4, 3, 6);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(width, height);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.12;

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 20, 14),
  new THREE.MeshLambertMaterial({ color: 0x44aa88 }),
);
scene.add(sphere);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
}
animate();`;
