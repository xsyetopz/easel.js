import {
  BasicMaterial,
  BoxGeometry,
  DDSLoader,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_texture_dds",
  name: "DDS texture loader",
  category: "canvas",
  description:
    "Decodes portable uncompressed RGBA/BGRA DDS pixels into a Canvas2D texture; compressed DXT/BCn stays an explicit GPU boundary.",
};
export const controls = [];

function makeDdsFixture() {
  const width = 4;
  const height = 4;
  const bytes = new Uint8Array(128 + width * height * 4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x20534444, true);
  view.setUint32(4, 124, true);
  view.setUint32(8, 0x1007, true);
  view.setUint32(12, height, true);
  view.setUint32(16, width, true);
  view.setUint32(20, width * 4, true);
  view.setUint32(76, 32, true);
  view.setUint32(80, 0x41, true);
  view.setUint32(88, 32, true);
  view.setUint32(92, 0x00ff0000, true);
  view.setUint32(96, 0x0000ff00, true);
  view.setUint32(100, 0x000000ff, true);
  view.setUint32(104, 0xff000000, true);
  view.setUint32(108, 0x1000, true);
  const colors = [
    [238, 91, 77, 255],
    [255, 202, 58, 255],
    [25, 130, 196, 255],
    [89, 193, 83, 255],
  ];
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const color = colors[(row < 2 ? 0 : 2) + (column < 2 ? 0 : 1)];
      const offset = 128 + (row * width + column) * 4;
      bytes[offset] = color[2];
      bytes[offset + 1] = color[1];
      bytes[offset + 2] = color[0];
      bytes[offset + 3] = color[3];
    }
  }
  return bytes.buffer;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(3.1, 2.5, 6.4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const loader = new DDSLoader();
  const parsed = loader.parse(makeDdsFixture());
  const texture = loader.toDataTexture(parsed);
  const cube = new Mesh(
    new BoxGeometry(2.5, 2.5, 2.5),
    new BasicMaterial({ map: texture }),
  );
  scene.add(cube);
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    const delta = timer.update().delta;
    cube.rotation.x += delta * 0.35;
    cube.rotation.y += delta * 0.25;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      texture.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const loader = new EASEL.DDSLoader();
const decoded = loader.parse(arrayBuffer);
const texture = loader.toDataTexture(decoded);
scene.add(new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ map: texture })));`;

export const threeSource = `import * as THREE from "three";
import { DDSLoader } from "three/addons/loaders/DDSLoader.js";
const texture = new DDSLoader().load("textures/wave_normals_24bit_uncompressed.dds");
scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture })));`;

export const example = { meta, controls, setup, easelSource, threeSource };
