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

export const meta = {
  id: "misc_boxselection",
  name: "Box Selection",
  category: "misc",
  description: "Drag a rectangle across the Canvas2D scene to select meshes.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x101724;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.4, 8);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.4));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 5, 6);
  scene.add(light);
  const meshes = Array.from({ length: 12 }, (_, index) => {
    const mesh = new Mesh(
      new BoxGeometry(0.9, 0.9, 0.9),
      new LambertMaterial({ color: 0x5b9fe0 }),
    );
    mesh.position.set(
      ((index % 4) - 1.5) * 1.65,
      (Math.floor(index / 4) - 1) * 1.65,
      0,
    );
    scene.add(mesh);
    return mesh;
  });
  let start;
  let current;
  const select = (event) => {
    const bounds = canvas.getBoundingClientRect();
    current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    if (!start) return;
    const left = Math.min(start.x, current.x);
    const right = Math.max(start.x, current.x);
    const top = Math.min(start.y, current.y);
    const bottom = Math.max(start.y, current.y);
    for (const [index, mesh] of meshes.entries()) {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = (((column - 1.5) * 1.65) / 8) * width + width / 2;
      const y = height / 2 - (((row - 1) * 1.65) / 8) * width;
      const inside = x >= left && x <= right && y >= top && y <= bottom;
      mesh.material.color.hex = inside ? 0xf2b84b : 0x5b9fe0;
    }
  };
  const begin = (event) => {
    start = { x: event.offsetX, y: event.offsetY };
    current = start;
  };
  const end = () => {
    start = undefined;
    current = undefined;
  };
  canvas.addEventListener("pointerdown", begin);
  canvas.addEventListener("pointermove", select);
  canvas.addEventListener("pointerup", end);
  const clock = new Timer();
  let frame;
  function animate(timestamp) {
    frame = requestAnimationFrame(animate);
    clock.update(timestamp);
    for (const mesh of meshes) mesh.rotation.y += clock.delta * 0.2;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      canvas.removeEventListener("pointerdown", begin);
      canvas.removeEventListener("pointermove", select);
      canvas.removeEventListener("pointerup", end);
      if (frame !== undefined) cancelAnimationFrame(frame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const selection = new EASEL.BoxSelection(camera, canvas);
selection.onChange((objects) => objects.forEach((object) => object.material.color.set(0xf2b84b)));`;
export const threeSource = `import * as THREE from "three";
import { SelectionBox } from "three/addons/interactive/SelectionBox.js";
import { SelectionHelper } from "three/addons/interactive/SelectionHelper.js";

const selectionBox = new SelectionBox(camera, scene);
const helper = new SelectionHelper(selectionBox, renderer, "selectBox");`;
export const example = { meta, controls, setup, easelSource, threeSource };
