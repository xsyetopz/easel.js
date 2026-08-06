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
  id: "webgl_loader_ifc",
  name: "IFC loader",
  category: "canvas",
  description:
    "IFC BIM mesh demonstrated as CPU geometry. EASEL has no native IFC parser; procedural geometry stands in for parsed mesh data.",
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
  scene.add(new AmbientLight(0xffffff, 0.5));
  const light = new DirectionalLight(0xffffff, 0.8);
  light.position.set(2, 3, 4);
  scene.add(light);
  const mesh = new Mesh(
    new BoxGeometry(1.8, 1.8, 1.8),
    new LambertMaterial({ color: 0x4fc1e8 }),
  );
  scene.add(mesh);
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    mesh.rotation.y += timer.update().delta * 0.35;
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
const mesh = new EASEL.Mesh(geometry, new EASEL.LambertMaterial());`;

export const threeSource = `import * as THREE from "three";
// Loader demonstration;
const geometry = new THREE.BoxGeometry(2, 2, 2);
const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial());`;

export const example = { meta, controls, setup, easelSource, threeSource };
