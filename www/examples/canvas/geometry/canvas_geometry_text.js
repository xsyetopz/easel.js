import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_geometry_text",
  name: "Block Text",
  category: "canvas",
  description:
    "Authored bitmap glyphs made from BoxGeometry blocks replace TextGeometry and font loading in this CPU scene.",
};

export const controls = [];

const glyphs = {
  E: ["1111", "1000", "1110", "1000", "1111"],
  A: ["0110", "1001", "1111", "1001", "1001"],
  S: ["0111", "1000", "0110", "0001", "1110"],
  L: ["1000", "1000", "1000", "1000", "1111"],
};

function addText(root, text, cube, material) {
  const advance = 1.15;
  const start = -((text.length - 1) * advance) / 2;
  for (let letterIndex = 0; letterIndex < text.length; letterIndex++) {
    const pattern = glyphs[text[letterIndex]] ?? glyphs.E;
    for (let row = 0; row < pattern.length; row++) {
      for (let column = 0; column < pattern[row].length; column++) {
        if (pattern[row][column] !== "1") continue;
        const block = new Mesh(cube, material);
        block.position.set(
          start + letterIndex * advance + (column - 1.5) * 0.2,
          (2 - row) * 0.2,
          0,
        );
        root.add(block);
      }
    }
  }
}

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x111827;
  const camera = new PerspectiveCamera({
    fov: 40,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.2, 7.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.4));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(3, 5, 6);
  scene.add(light);
  const root = new Group();
  scene.add(root);
  const cube = new BoxGeometry(0.18, 0.18, 0.3);
  cube.computeBoundingSphere();
  addText(root, "EASEL", cube, new LambertMaterial({ color: 0x67c5e5 }));
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    root.rotation.y += clock.update().delta * 0.25;
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

root.add(new EASEL.Mesh(blockGeometry, glyphMaterial));`;

export const threeSource = `import * as THREE from "three";

import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

const font = await new FontLoader().loadAsync("fonts/helvetiker_regular.typeface.json");
const geometry = new TextGeometry("EASEL", { font });`;

export const example = { meta, controls, setup, easelSource, threeSource };
