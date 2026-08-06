import {
  AmbientLight,
  BasicMaterial,
  PCDLoader,
  PerspectiveCamera,
  Points,
  Renderer,
  Scene,
  Timer,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_pcd",
  name: "PCD loader",
  category: "canvas",
  description: "ASCII PCD point-cloud parsing with CPU colors.",
};
export const controls = [];
const source =
  "VERSION .7\nFIELDS x y z rgb\nSIZE 4 4 4 4\nTYPE F F F F\nCOUNT 1 1 1 1\nWIDTH 4\nHEIGHT 1\nPOINTS 4\nDATA ascii\n-1 0 0 16711680\n0 1 0 65280\n1 0 0 255\n0 -1 0 16776960";
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
  camera.position.z = 4;
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.8));
  const geometry = new PCDLoader().parse(source);
  const points = new Points(geometry, new BasicMaterial({ color: 0xffffff }));
  scene.add(points);
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    points.rotation.y += timer.update().delta * 0.4;
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
const geometry = new EASEL.PCDLoader().parse(text);
const points = new EASEL.Points(geometry, material);`;
export const threeSource = `import * as THREE from "three";
import { PCDLoader } from "three/addons/loaders/PCDLoader.js";
const loader = new PCDLoader();
const points = loader.parse(text);`;
export const example = { meta, controls, setup, easelSource, threeSource };
