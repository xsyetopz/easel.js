import {
  AmbientLight,
  GLTFLoader,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "product-model-viewer",
  name: "Product Model Viewer",
  category: "assets",
  animated: true,
  description: "Review a glTF asset with a fixed camera and clean lighting.",
};
export const controls = [];

function makeDocument() {
  const bytes = new Uint8Array(36);
  const view = new DataView(bytes.buffer);
  [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((value, index) => {
    view.setFloat32(index * 4, value, true);
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
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bytes.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
    materials: [
      {
        name: "Triangle",
        pbrMetallicRoughness: { baseColorFactor: [0.35, 0.7, 1, 1] },
      },
    ],
    meshes: [
      {
        name: "Triangle",
        primitives: [{ attributes: { POSITION: 0 }, material: 0 }],
      },
    ],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
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
  scene.add(new AmbientLight(0xffffff, 0.35));
  const result = new GLTFLoader().parse(makeDocument(), {
    materialType: "lambert",
  });
  scene.add(result.scene);
  const timer = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    result.scene.rotation.y += timer.update().delta * 0.35;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const result = new EASEL.GLTFLoader().parse(document);
scene.add(result.scene);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
