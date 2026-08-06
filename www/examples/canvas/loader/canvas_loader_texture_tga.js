import {
  AmbientLight,
  BasicMaterial,
  BoxGeometry,
  DataTexture,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  TGALoader,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_texture_tga",
  name: "TGA texture loader",
  category: "canvas",
  description: "Decodes a CPU TGA texture and samples it on a Canvas2D cube.",
};
export const controls = [];

function makeTgaFixture() {
  const pixels = [0, 0, 255, 0, 255, 0, 255, 0, 0, 0, 255, 255];
  const bytes = new Uint8Array(18 + pixels.length);
  bytes[2] = 2;
  bytes[12] = 2;
  bytes[14] = 2;
  bytes[16] = 24;
  bytes[17] = 0x20;
  bytes.set(pixels, 18);
  return bytes.buffer;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x111824;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(2.8, 2.2, 5.8);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.9));
  const parsed = new TGALoader().parse(makeTgaFixture());
  const texture = new DataTexture(parsed.data, parsed.width, parsed.height);
  texture.buildBrightnessLevels();
  const cube = new Mesh(
    new BoxGeometry(2.4, 2.4, 2.4),
    new BasicMaterial({ map: texture }),
  );
  scene.add(cube);
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    cube.rotation.x += timer.update().delta * 0.35;
    cube.rotation.y += timer.delta * 0.2;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      texture.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const decoded = new EASEL.TGALoader().parse(arrayBuffer);
const texture = new EASEL.DataTexture(decoded.data, decoded.width, decoded.height);
const cube = new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ map: texture }));`;

export const threeSource = `import * as THREE from "three";
import { TGALoader } from "three/addons/loaders/TGALoader.js";
const texture = new TGALoader().load("textures/crate_color8.tga");
const cube = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ map: texture }));`;

export const example = { meta, controls, setup, easelSource, threeSource };
