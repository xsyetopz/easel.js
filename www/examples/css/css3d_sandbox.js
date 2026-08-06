import {
  AmbientLight,
  CSS3DObject,
  CSS3DRenderer,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "css3d_sandbox",
  name: "CSS3D sandbox",
  category: "css3d",
  description:
    "A DOM sandbox floats above a CPU Canvas2D scene with shared transforms.",
};

export const controls = [];

export function setup(canvas) {
  const stage = canvas.parentElement;
  if (!stage || typeof globalThis.document === "undefined") return;
  const width = Math.max(300, stage.clientWidth || canvas.width || 640);
  const height = Math.max(240, stage.clientHeight || canvas.height || 360);
  stage.style.position = "relative";
  const scene = new Scene();
  scene.background = 0x0b1020;
  const camera = new PerspectiveCamera({
    fov: 48,
    aspect: width / height,
    near: 0.1,
    far: 60,
  });
  camera.position.set(0, 0.4, 7);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.95);
  light.position.set(4, 5, 6);
  scene.add(light);
  const floor = new Mesh(
    new PlaneGeometry(8, 5),
    new LambertMaterial({ color: 0x263c5d }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.4;
  scene.add(floor);

  const overlay = new CSS3DRenderer({ width, height });
  if (!overlay.domElement) return;
  overlay.domElement.style.position = "absolute";
  overlay.domElement.style.inset = "0";
  overlay.domElement.style.zIndex = "2";
  stage.append(overlay.domElement);
  const cards = ["CPU scene", "DOM layer", "Shared camera"].map(
    (text, index) => {
      const card = globalThis.document.createElement("div");
      card.textContent = text;
      card.style.background =
        index === 1 ? "rgba(213, 111, 68, 0.92)" : "rgba(37, 101, 154, 0.92)";
      card.style.border = "1px solid rgba(255,255,255,0.75)";
      card.style.borderRadius = "8px";
      card.style.color = "white";
      card.style.font = "600 13px system-ui";
      card.style.padding = "9px 12px";
      const object = new CSS3DObject(card);
      object.position.set((index - 1) * 1.8, 1.1 + (index % 2) * 0.35, 0);
      object.rotation.z = (index - 1) * 0.07;
      scene.add(object);
      return object;
    },
  );

  const clock = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    const delta = clock.update().delta;
    for (const [index, card] of cards.entries())
      card.rotation.y = Math.sin(clock.elapsedTime * 0.7 + index) * 0.08;
    floor.rotation.z += delta * 0.04;
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

const object = new EASEL.CSS3DObject(globalThis.document.createElement("div"));
scene.add(object);
const renderer = new EASEL.CSS3DRenderer({ width, height });
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";

const object = new CSS3DObject(document.createElement("div"));
scene.add(object);
const renderer = new CSS3DRenderer();
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
