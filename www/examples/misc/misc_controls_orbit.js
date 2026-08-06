import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  TorusKnotGeometry,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "misc_controls_orbit",
  name: "Orbit Controls",
  category: "misc",
  description: "Pointer orbit, pan, and wheel zoom around a Canvas2D scene.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(3, 2, 6);
  camera.lookAt(new Vector3(0, 0, 0));
  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(0, 0, 0);
  orbit.enableDamping = true;
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 5, 6);
  scene.add(light);
  const mesh = new Mesh(
    new TorusKnotGeometry(1, 0.3, 48, 10),
    new LambertMaterial({ color: 0x588fd4 }),
  );
  scene.add(mesh);
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    mesh.rotation.y += clock.update().delta * 0.35;
    orbit.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      orbit.dispose();
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const controls = new EASEL.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();`;

export const threeSource = `import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();`;

export const example = { meta, controls, setup, easelSource, threeSource };
