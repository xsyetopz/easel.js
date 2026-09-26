import {
  DirectionalLight,
  HemisphereLight,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  VOXLoader,
} from "@/index.js";

import monumentBase64 from "../../../../assets/vox/monu10.vox.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

const monumentBuffer = Uint8Array.from(atob(monumentBase64), (value) =>
  value.charCodeAt(0),
).buffer;

export const meta = {
  id: "canvas_loader_vox",
  upstream: "webgl_loader_vox",
  name: "loader / vox",
  category: "canvas",
  animated: true,
  description:
    "Parse a MagicaVoxel monument with VOXLoader, light it with hemisphere and directional lights, and orbit it.",
  differences: [
    "EASEL VOXLoader builds a vertex-colored LambertMaterial mesh with per-vertex baked lighting instead of the per-pixel MeshStandardMaterial that three.js builds.",
    "EASEL lights in display color space without the linear-to-sRGB output conversion, so mid-tones differ slightly.",
    "Edges are aliased because EASEL has no antialiasing.",
  ],
};
export const controls = [];

export function setup(canvas) {
  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: canvas.width / canvas.height,
    near: 0.01,
    far: 10,
  });
  camera.position.set(0.175, 0.075, 0.175);

  const scene = new Scene();
  scene.add(camera);

  // light

  const hemiLight = new HemisphereLight(0xcccccc, 0x444444, 3);
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff, 2.5);
  dirLight.position.set(1.5, 3, 2.5);
  scene.add(dirLight);

  const dirLight2 = new DirectionalLight(0xffffff, 1.5);
  dirLight2.position.set(-1.5, -3, -2.5);
  scene.add(dirLight2);

  const loader = new VOXLoader();
  const result = loader.parse(monumentBuffer);

  const mesh = result.scene.children[0];
  mesh.position.y = 0;
  mesh.scale.setScalar(0.0015);
  scene.add(mesh);

  // renderer

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  // controls

  const orbit = new OrbitControls(camera, canvas);
  orbit.minDistance = 0.1;
  orbit.maxDistance = 0.5;

  const animation = createExampleAnimationLoop(() => {
    orbit.update();

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    },
    cleanup() {
      animation.cleanup();
      orbit.dispose();
      mesh.geometry.dispose();
      mesh.material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

scene.add(new EASEL.HemisphereLight(0xcccccc, 0x444444, 3));
const dirLight = new EASEL.DirectionalLight(0xffffff, 2.5);
dirLight.position.set(1.5, 3, 2.5);
scene.add(dirLight);

const result = new EASEL.VOXLoader().parse(monumentBuffer);
const mesh = result.scene.children[0];
mesh.position.y = 0;
mesh.scale.setScalar(0.0015);
scene.add(mesh);

const orbit = new EASEL.OrbitControls(camera, canvas);
orbit.minDistance = 0.1;
orbit.maxDistance = 0.5;
orbit.update();
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
