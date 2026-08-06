import {
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  Timer,
  Vector3,
  XYZLoader,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_xyz",
  name: "XYZ loader",
  category: "canvas",
  description: "XYZ and XYZRGB point-cloud parsing on the CPU.",
};
export const controls = [];

const source = `# x y z r g b
-1 0 0 255 80 80
0 1 0 80 255 120
1 0 0 80 140 255
0 -1 0 255 220 80`;

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
  camera.position.set(0, 0, 4.4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const geometry = new XYZLoader().parse(source);
  const points = new Points(
    geometry,
    new PointsMaterial({ color: 0xffffff, size: 5 }),
  );
  scene.add(points);
  const timer = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = globalThis.requestAnimationFrame(animate);
    points.rotation.y += timer.update().delta * 0.35;
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
import { XYZLoader } from "@xsyetopz/easel";

const geometry = new XYZLoader().parse(text);
const points = new EASEL.Points(geometry, material);`;

export const threeSource = `import * as THREE from "three";
import { XYZLoader } from "three/addons/loaders/XYZLoader.js";

const loader = new XYZLoader();
const geometry = loader.parse(text);
const points = new THREE.Points(geometry, material);`;

export const example = { meta, controls, setup, easelSource, threeSource };
