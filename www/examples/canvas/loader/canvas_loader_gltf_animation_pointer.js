import {
  AmbientLight,
  GLTFLoader,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_gltf_animation_pointer",
  name: "glTF animation pointer",
  category: "canvas",
  description:
    "Preserves KHR_animation_pointer targets and applies a decoded node rotation on the CPU.",
};
export const controls = [];

function makeDocument() {
  const bytes = new Uint8Array(76);
  const view = new DataView(bytes.buffer);
  [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((value, index) => {
    view.setFloat32(index * 4, value, true);
  });
  [0, 1].forEach((value, index) => {
    view.setFloat32(36 + index * 4, value, true);
  });
  [0, 0, 0, 1, 0, Math.SQRT1_2, 0, Math.SQRT1_2].forEach((value, index) => {
    view.setFloat32(44 + index * 4, value, true);
  });
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return {
    asset: { version: "2.0" },
    buffers: [
      {
        uri: `data:application/octet-stream;base64,${globalThis.btoa(binary)}`,
        byteLength: bytes.length,
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 8 },
      { buffer: 0, byteOffset: 44, byteLength: 32 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 1, componentType: 5126, count: 2, type: "SCALAR" },
      { bufferView: 2, componentType: 5126, count: 2, type: "VEC4" },
    ],
    materials: [
      {
        name: "Pointer material",
        pbrMetallicRoughness: { baseColorFactor: [0.2, 0.7, 1, 1] },
      },
    ],
    meshes: [
      {
        name: "Pointer triangle",
        primitives: [{ attributes: { POSITION: 0 }, material: 0 }],
      },
    ],
    nodes: [{ name: "Animated pointer node", mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
    animations: [
      {
        name: "Pointer rotation",
        samplers: [{ input: 1, output: 2 }],
        channels: [
          {
            sampler: 0,
            target: {
              path: "pointer",
              extensions: {
                KHR_animation_pointer: { pointer: "/nodes/0/rotation" },
              },
            },
          },
        ],
      },
    ],
  };
}

function sampleRotation(channel, time) {
  const times = channel.times;
  const values = channel.values;
  const duration = times.at(-1) || 0;
  const current = duration > 0 ? time % duration : 0;
  let index = 0;
  while (index + 1 < times.length && current >= times[index + 1]) index++;
  const start = times[index] || 0;
  const end = times[index + 1] ?? start;
  const amount = end > start ? (current - start) / (end - start) : 0;
  const offset = index * 4;
  const nextOffset = Math.min(offset + 4, values.length - 4);
  return [0, 1, 2, 3].map(
    (component) =>
      (values[offset + component] || 0) * (1 - amount) +
      (values[nextOffset + component] || 0) * amount,
  );
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0, 4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.45));
  const result = new GLTFLoader().parse(makeDocument(), {
    materialType: "lambert",
  });
  const mesh = result.scene.children[0];
  if (!(mesh instanceof Mesh))
    throw new Error("glTF pointer fixture did not create a mesh.");
  const channel = result.animations[0]?.channels[0];
  if (channel?.target.pointer !== "/nodes/0/rotation")
    throw new Error(
      "glTF pointer fixture did not preserve its animation target.",
    );
  scene.add(result.scene);
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    timer.update();
    mesh.quaternion.fromArray(sampleRotation(channel, timer.elapsedTime));
    mesh.updateMatrix();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      scene.remove(result.scene);
      mesh.geometry?.dispose();
      mesh.material?.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const result = new EASEL.GLTFLoader().parse(document);
const channel = result.animations[0].channels[0];
const node = result.scene.children[0];
node.quaternion.fromArray(channel.values.slice(0, 4));
scene.add(result.scene);`;

export const threeSource = `import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFAnimationPointerExtension } from "@needle-tools/three-animation-pointer";

const loader = new GLTFLoader();
loader.register((parser) => new GLTFAnimationPointerExtension(parser));
loader.parse(arrayBuffer, "", (gltf) => scene.add(gltf.scene));`;

export const example = { meta, controls, setup, easelSource, threeSource };
