import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_helpers",
  name: "Helpers",
  category: "canvas",
  description:
    "CPU scene helpers: CameraHelper, DirectionalLight, and bounding box demonstrated with EASEL's Canvas2D renderer.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = new Color(0x121826);
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(3, 3, 5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.4));
  const light = new DirectionalLight(0xffffff, 0.8);
  light.position.set(2, 3, 4);
  scene.add(light);
  const mesh = new Mesh(
    new BoxGeometry(2, 2, 2),
    new LambertMaterial({ color: 0x4fc1e8 }),
  );
  scene.add(mesh);
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    mesh.rotation.y += timer.update().delta * 0.3;
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
// Loader demonstration;
scene.add(helper);`;

export const threeSource = `import * as THREE from "three";
// Loader demonstration;
scene.add(helper);`;

export const example = { meta, controls, setup, easelSource, threeSource };
