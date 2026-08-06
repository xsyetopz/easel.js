import {
  CSS3DSprite,
  CSS3DRenderer,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  TrackballControls,
} from "@/index.js";

export const meta = {
  id: "css3d_sprites",
  name: "CSS3D sprites",
  category: "css3d",
  description:
    "Animate DOM sprites through plane, cube, random, and sphere layouts.",
};

export const controls = [];

export function setup(canvas) {
  const stage = canvas.parentElement;
  if (!stage || typeof globalThis.document === "undefined") return;
  const width = Math.max(300, stage.clientWidth || canvas.width || 640);
  const height = Math.max(240, stage.clientHeight || canvas.height || 360);
  const previousPosition = stage.style.position;
  stage.style.position = "relative";
  const scene = new Scene();
  scene.background = 0xffffff;
  const camera = new PerspectiveCamera({
    fov: 75,
    aspect: width / height,
    near: 1,
    far: 5000,
  });
  camera.position.set(600, 400, 1500);
  camera.lookAt(0, 0, 0);
  const renderer = new Renderer({ canvas, width, height });
  const overlay = new CSS3DRenderer({ width, height });
  if (!overlay.domElement) return;
  overlay.domElement.style.position = "absolute";
  overlay.domElement.style.inset = "0";
  overlay.domElement.style.zIndex = "2";
  stage.append(overlay.domElement);
  const controls = new TrackballControls(camera, overlay.domElement);
  const particlesTotal = 512;
  const objects = [];
  const positions = [[], [], [], []];
  const amountX = 16;
  const amountZ = 32;
  const separationPlane = 150;
  const offsetX = ((amountX - 1) * separationPlane) / 2;
  const offsetZ = ((amountZ - 1) * separationPlane) / 2;
  for (let index = 0; index < particlesTotal; index++) {
    const x = (index % amountX) * separationPlane;
    const z = Math.floor(index / amountX) * separationPlane;
    positions[0].push([
      x - offsetX,
      (Math.sin(x * 0.5) + Math.sin(z * 0.5)) * 200,
      z - offsetZ,
    ]);
  }
  const amount = 8;
  const separationCube = 150;
  const offset = ((amount - 1) * separationCube) / 2;
  for (let index = 0; index < particlesTotal; index++) {
    positions[1].push([
      (index % amount) * separationCube - offset,
      (Math.floor(index / amount) % amount) * separationCube - offset,
      Math.floor(index / (amount * amount)) * separationCube - offset,
    ]);
  }
  for (let index = 0; index < particlesTotal; index++) {
    const seed = index * 1664525 + 1013904223;
    positions[2].push([
      ((seed >>> 0) % 4000) - 2000,
      (((seed * 1103515245) >>> 0) % 4000) - 2000,
      (((seed * 214013) >>> 0) % 4000) - 2000,
    ]);
  }
  const radius = 750;
  for (let index = 0; index < particlesTotal; index++) {
    const phi = Math.acos(-1 + (2 * index) / particlesTotal);
    const theta = Math.sqrt(particlesTotal * Math.PI) * phi;
    positions[3].push([
      radius * Math.cos(theta) * Math.sin(phi),
      radius * Math.sin(theta) * Math.sin(phi),
      radius * Math.cos(phi),
    ]);
  }
  for (let index = 0; index < particlesTotal; index++) {
    const element = globalThis.document.createElement("div");
    element.style.width = "28px";
    element.style.height = "28px";
    element.style.borderRadius = "50%";
    element.style.background =
      "radial-gradient(circle at 35% 30%, #fff 0, #8cf 18%, #2683c6 62%, #124263 100%)";
    element.style.boxShadow = "0 0 8px rgba(110,210,255,0.8)";
    const object = new CSS3DSprite(element);
    object.position.set(...positions[2][index]);
    scene.add(object);
    objects.push(object);
  }
  let current = 0;
  let transitionElapsed = Number.POSITIVE_INFINITY;
  let frame;
  const timer = new Timer();
  function transition(next) {
    current = next;
    transitionElapsed = 0;
  }
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    const delta = timer.update().delta;
    transitionElapsed += delta;
    if (transitionElapsed > 2.75) transition((current + 1) % positions.length);
    const progress = Math.min(1, transitionElapsed / 2.75);
    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - (-2 * progress + 2) ** 2 / 2;
    for (let index = 0; index < objects.length; index++) {
      const object = objects[index];
      const target = positions[current][index];
      const previous =
        positions[(current + positions.length - 1) % positions.length][index];
      object.position.set(
        previous[0] + (target[0] - previous[0]) * eased,
        previous[1] + (target[1] - previous[1]) * eased,
        previous[2] + (target[2] - previous[2]) * eased,
      );
      const scale =
        Math.sin(
          (Math.floor(object.position.x) + timer.elapsedTime * 1000) * 0.002,
        ) *
          0.3 +
        1;
      object.scale.set(scale, scale, scale);
    }
    controls.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    overlay.render(scene, camera);
  }
  transition(0);
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      controls.dispose();
      overlay.dispose();
      overlay.domElement?.remove();
      stage.style.position = previousPosition;
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const object = new EASEL.CSS3DSprite(globalThis.document.createElement("div"));
scene.add(object);
const renderer = new EASEL.CSS3DRenderer({ width, height });
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";
import TWEEN from "three/addons/libs/tween.module.js";
import { CSS3DSprite, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";

const object = new CSS3DSprite(image.cloneNode());
scene.add(object);
new TWEEN.Tween(object.position).to(target, 2000).start();`;

export const example = { meta, controls, setup, easelSource, threeSource };
