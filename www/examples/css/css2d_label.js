import {
  AmbientLight,
  CSS2DObject,
  CSS2DRenderer,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "css2d_label",
  name: "CSS2D label",
  category: "css2d",
  description:
    "A DOM label follows a CPU-rendered EASEL object through camera projection.",
};
export const controls = [];

export function setup(canvas) {
  const stage = canvas.parentElement;
  if (!stage || typeof globalThis.document === "undefined") return;
  const width = Math.max(300, stage.clientWidth || canvas.width || 640);
  const height = Math.max(240, stage.clientHeight || canvas.height || 360);
  const scene = new Scene();
  scene.background = 0x101b2d;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0.2, 4.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(2, 3, 4);
  scene.add(light);
  const mesh = new Mesh(
    new SphereGeometry(1, 24, 16),
    new LambertMaterial({ color: 0x5ba9df }),
  );
  scene.add(mesh);
  const label = globalThis.document.createElement("div");
  label.textContent = "EASEL.js";
  label.style.color = "white";
  label.style.font = "600 14px system-ui";
  const overlayNode = new CSS2DObject(label);
  overlayNode.position.y = 1.15;
  mesh.add(overlayNode);
  const overlay = new CSS2DRenderer({ width, height });
  if (!overlay.domElement) return;
  stage.append(overlay.domElement);
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    mesh.rotation.y += timer.update().delta * 0.35;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    overlay.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      overlay.domElement?.remove();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const label = document.createElement("div");
label.textContent = "EASEL.js";
const object = new EASEL.CSS2DObject(label);
mesh.add(object);
const renderer = new EASEL.CSS2DRenderer({ width, height });`;

export const threeSource = `import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

const object = new CSS2DObject(label);
mesh.add(object);
const renderer = new CSS2DRenderer();`;

export const example = { meta, controls, setup, easelSource, threeSource };
