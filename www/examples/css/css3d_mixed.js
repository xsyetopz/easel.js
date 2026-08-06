import {
  AmbientLight,
  BoxGeometry,
  CSS3DObject,
  CSS3DRenderer,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "css3d_mixed",
  name: "CSS3D mixed",
  category: "css3d",
  description:
    "A CPU-rendered EASEL scene shares its camera with transformed DOM panels.",
};

export const controls = [];

export function setup(canvas) {
  const stage = canvas.parentElement;
  if (!stage || typeof globalThis.document === "undefined") return;
  const width = Math.max(300, stage.clientWidth || canvas.width || 640);
  const height = Math.max(240, stage.clientHeight || canvas.height || 360);
  stage.style.position = "relative";
  const scene = new Scene();
  scene.background = 0x121a2c;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0.2, 6);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(3, 4, 5);
  scene.add(light);
  const mesh = new Mesh(
    new BoxGeometry(1.7, 1.7, 1.7),
    new LambertMaterial({ color: 0x4f91d1 }),
  );
  scene.add(mesh);

  const overlay = new CSS3DRenderer({ width, height });
  if (!overlay.domElement) return;
  overlay.domElement.style.position = "absolute";
  overlay.domElement.style.inset = "0";
  overlay.domElement.style.zIndex = "2";
  stage.append(overlay.domElement);
  const panel = globalThis.document.createElement("div");
  panel.textContent = "Canvas2D + CSS3D";
  panel.style.background = "rgba(20, 35, 60, 0.9)";
  panel.style.border = "1px solid #7cc7ff";
  panel.style.borderRadius = "10px";
  panel.style.color = "#e7f5ff";
  panel.style.font = "600 14px system-ui";
  panel.style.padding = "12px 16px";
  const panelObject = new CSS3DObject(panel);
  panelObject.position.set(1.5, 1.1, 0);
  panelObject.rotation.y = -0.25;
  scene.add(panelObject);

  const clock = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    mesh.rotation.y += clock.update().delta * 0.4;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    overlay.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      overlay.dispose();
      overlay.domElement?.remove();
      stage.style.position = "";
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const panel = globalThis.document.createElement("div");
const object = new EASEL.CSS3DObject(panel);
object.position.set(1.5, 1.1, 0);
scene.add(object);
const renderer = new EASEL.CSS3DRenderer({ width, height });
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";

const object = new CSS3DObject(panel);
object.position.set(1.5, 1.1, 0);
scene.add(object);
const renderer = new CSS3DRenderer();
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
