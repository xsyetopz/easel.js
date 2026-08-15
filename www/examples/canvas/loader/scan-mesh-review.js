import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PLYLoader,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import source from "../../../../assets/ply/dolphins.ply?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { aimCamera } from "../../../runtime/example-camera.ts";

export const meta = {
  id: "scan-mesh-review",
  name: "Scan Mesh Review",
  category: "assets",
  animated: true,
  description:
    "Triangulate a polygon PLY dolphin scan and reconstruct smooth normals.",
};
export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x121826;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0.6, 5.5);
  aimCamera(camera, new Vector3());
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.3));
  const light = new DirectionalLight(0xffffff, 1.15);
  light.position.set(3, 5, 4);
  scene.add(light);
  const geometry = new PLYLoader().parse(source);
  geometry.computeVertexNormals();
  geometry.center();
  const material = new LambertMaterial({ color: 0x63c2d8 });
  const mesh = new Mesh(geometry, material);
  mesh.scale.setScalar(0.006);
  scene.add(mesh);
  const timer = new Timer();
  const animation = createExampleAnimationLoop(() => {
    mesh.rotation.y += timer.update().delta * 0.18;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const geometry = new EASEL.PLYLoader().parse(plyText);
geometry.computeVertexNormals();
geometry.center();
const mesh = new EASEL.Mesh(geometry, material);`;
export const example = { meta, controls, setup, easelSource };
