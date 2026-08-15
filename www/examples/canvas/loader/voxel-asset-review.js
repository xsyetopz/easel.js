import {
  AmbientLight,
  buildVOXMesh,
  DirectionalLight,
  LambertMaterial,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
  VOXLoader,
} from "@/index.js";

import knightBase64 from "../../../../assets/vox/chr_knight.vox.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { aimCamera } from "../../../runtime/example-camera.ts";

const knightBuffer = Uint8Array.from(atob(knightBase64), (value) =>
  value.charCodeAt(0),
).buffer;

export const meta = {
  id: "voxel-asset-review",
  name: "Voxel Asset Review",
  category: "assets",
  animated: true,
  description:
    "Inspect a MagicaVoxel knight while preserving its authored palette.",
};
export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 48,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(4.8, 3.8, 6.5);
  aimCamera(camera, new Vector3());
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.45));
  const key = new DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 6, 5);
  scene.add(key);
  const result = new VOXLoader().parse(knightBuffer);
  const mesh = buildVOXMesh(result.chunks[0]);
  mesh.geometry.center();
  mesh.scale.setScalar(0.28);
  mesh.material = new LambertMaterial({ vertexColors: true });
  scene.add(mesh);
  const timer = new Timer();
  const animation = createExampleAnimationLoop(() => {
    mesh.rotation.y += timer.update().delta * 0.16;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      mesh.geometry.dispose();
      mesh.material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const result = new EASEL.VOXLoader().parse(arrayBuffer);
const mesh = EASEL.buildVOXMesh(result.chunks[0]);
mesh.material = new EASEL.LambertMaterial({ vertexColors: true });
scene.add(mesh);`;
export const example = { meta, controls, setup, easelSource };
