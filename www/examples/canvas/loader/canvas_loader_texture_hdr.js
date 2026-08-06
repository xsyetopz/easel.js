import {
  AmbientLight,
  BoxGeometry,
  BasicMaterial,
  Color,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_texture_hdr",
  name: "HDR texture loader",
  category: "canvas",
  description:
    "HDR radiance texture demonstrated on CPU geometry. EASEL has HDRLoader but no HDR texture display; BasicMaterial stands in for HDR sampled material.",
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
  camera.position.set(0, 0, 4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.6));
  const light = new DirectionalLight(0xffffff, 0.7);
  light.position.set(2, 3, 4);
  scene.add(light);
  const mesh = new Mesh(
    new BoxGeometry(1.8, 1.8, 1.8),
    new BasicMaterial({ color: 0x6c9ac4 }),
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
const material = new EASEL.BasicMaterial({ map: texture });`;

export const threeSource = `import * as THREE from "three";
// Loader demonstration;
const material = new THREE.MeshBasicMaterial({ map: texture });`;

export const example = { meta, controls, setup, easelSource, threeSource };
