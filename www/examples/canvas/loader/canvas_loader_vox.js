import {
  AmbientLight,
  buildVOXMesh,
  LambertMaterial,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
  VOXLoader,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_vox",
  name: "VOX loader",
  category: "canvas",
  description: "Greedy-meshes a MagicaVoxel model with CPU palette colors.",
};
export const controls = [];

function u32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function chunk(id, content, children = new Uint8Array()) {
  const bytes = new Uint8Array(12 + content.length + children.length);
  for (let index = 0; index < 4; index++) bytes[index] = id.charCodeAt(index);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, content.length, true);
  view.setUint32(8, children.length, true);
  bytes.set(content, 12);
  bytes.set(children, 12 + content.length);
  return bytes;
}

function makeVoxFixture() {
  const voxels = [];
  for (let z = 0; z < 3; z++) {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (x === 1 && y === 1 && z === 1) continue;
        voxels.push(x, y, z, ((x + y + z) % 3) + 1);
      }
    }
  }
  const size = new Uint8Array(12);
  size.set(u32(3), 0);
  size.set(u32(3), 4);
  size.set(u32(3), 8);
  const xyzi = new Uint8Array(4 + voxels.length);
  xyzi.set(u32(voxels.length / 4), 0);
  xyzi.set(voxels, 4);
  const palette = new Uint8Array(256 * 4);
  palette.set(u32(0xff0000ff), 4);
  palette.set(u32(0xff00ff00), 8);
  palette.set(u32(0xffff0000), 12);
  const children = new Uint8Array(
    chunk("SIZE", size).length +
      chunk("XYZI", xyzi).length +
      chunk("RGBA", palette).length,
  );
  let offset = 0;
  for (const value of [
    chunk("SIZE", size),
    chunk("XYZI", xyzi),
    chunk("RGBA", palette),
  ]) {
    children.set(value, offset);
    offset += value.length;
  }
  const main = chunk("MAIN", new Uint8Array(), children);
  const output = new Uint8Array(8 + main.length);
  output.set([86, 79, 88, 32, ...u32(150)], 0);
  output.set(main, 8);
  return output.buffer;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(4.5, 3.5, 6.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 1));
  const result = new VOXLoader().parse(makeVoxFixture());
  const mesh = buildVOXMesh(result.chunks[0]);
  mesh.material = new LambertMaterial({ vertexColors: true });
  scene.add(mesh);
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    mesh.rotation.y += timer.update().delta * 0.35;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const result = new EASEL.VOXLoader().parse(arrayBuffer);
const mesh = EASEL.buildVOXMesh(result.chunks[0]);
scene.add(mesh);`;

export const threeSource = `import * as THREE from "three";
import { VOXLoader } from "three/addons/loaders/VOXLoader.js";
const result = new VOXLoader().parse(arrayBuffer);
scene.add(result.scene);`;

export const example = { meta, controls, setup, easelSource, threeSource };
