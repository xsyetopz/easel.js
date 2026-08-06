import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  ShapeGeometry,
  Timer,
  TTFFont,
  TTFLoader,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_ttf",
  name: "TTF loader",
  category: "canvas",
  description:
    "Decodes TrueType outlines into CPU ShapeGeometry and rasterizes the resulting text through Canvas2D.",
};

export const controls = [];

const FIXTURE_PARTS = [
  "AAEAAAAJAIAAAwAQY21hcABIAK0AAACcAAAAPGdseWYLRw+jAAAA2AAAAIRoZWFkAlsK8AAAAVwAAAA2aGhlYQZDAZ",
  "QAAAGUAAAAJGhtdHgINAAAAAABuAAAAAxsb2NhAAAA0AAAAcQAAAAQbWF4cAAEAAAAAAHUAAAABm5hbWUAmgT7AAAB",
  "3AAAABxwb3N0/58AMgAAAfgAAAAgAAAAAQADAAEAAAAMAAQAMAAAAAgAAAAAAAAAIAA/AEX//wAAACAAPwBF////4P",
  "/D/7wAAQAAAAAAAAAAAAEAAAAAAlgDIAALAAABAQEBAQEBAQEBAQEAAAJYAAD+NAAAAXwAAP6EAAABzAAA/agAAAAA",
  "AHgAAADcAAAAeAAAANwAAAB4AAAAAAABAAAAAAH0AyAABwAAAQEBAQEBAQEAAAH0AAD+ogAAAV4AAP4MAAAAAACWAA",
  "AB9AAAAJYAAAAAAAEAAAABAAAAAAAAAAAD6AAAA+gAAAAAAAAAAAAAAAAAAAAAAAAAAAJYAyAAAAAAAAAAAAABAAAA",
  "AQAAAyD/OAAAAyADIP84AAAAAQAAAAAAAAAAAAAAAAAAAAMCvAAAArwAAAK8AAAAAAAAAAAAAAAAAEwAAACEAAEAAA",
  "ADAAAAAAABABIAAwABBAkAAQAKAAAARQBBAFMARQBMAAMAAAAAAAD/nAAyAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
].join("");

function fixtureBytes() {
  return Uint8Array.from(globalThis.atob(FIXTURE_PARTS), (character) =>
    character.charCodeAt(0),
  );
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 40,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 8);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(2, 3, 5);
  scene.add(light);
  const data = new TTFLoader().parse(fixtureBytes());
  const font = new TTFFont(data);
  const text = new Mesh(
    new ShapeGeometry(font.generateShapes("EASEL", 2.4)),
    new LambertMaterial({ color: 0xf0b35f }),
  );
  text.position.set(-2.2, -1.2, 0);
  scene.add(text);
  const timer = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = globalThis.requestAnimationFrame(animate);
    text.rotation.y += timer.update().delta * 0.2;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined)
        globalThis.cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const data = new EASEL.TTFLoader().parse(arrayBuffer);
const font = new EASEL.TTFFont(data);
const geometry = new EASEL.ShapeGeometry(font.generateShapes("EASEL", 100));
const mesh = new EASEL.Mesh(geometry, material);`;

export const threeSource = `import * as THREE from "three";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";

const data = await new TTFLoader().loadAsync("fonts/ttf/kenpixel.ttf");
const font = new THREE.Font(data);
const geometry = new THREE.ShapeGeometry(font.generateShapes("EASEL", 100));
const mesh = new THREE.Mesh(geometry, material);`;

export const example = { meta, controls, setup, easelSource, threeSource };
