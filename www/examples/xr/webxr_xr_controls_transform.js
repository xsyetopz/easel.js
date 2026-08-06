import { PerspectiveCamera, Renderer, Mesh, BoxGeometry, AnimationMixer } from "@/index.js";

export const meta = {
  id: "webxr_xr_controls_transform",
  name: "XR XR controls transform",
  category: "webxr",
  description: "OrbitControls drive CPU scene; XR session rendering GPU-bound. CPU-only controls logic included.",
  gpuOnly: true,
  outOfScopeReason: "OrbitControls在EASEL中是CPU实现的; XR session渲染仍需GPU。",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, width / height, 0.1, 100);
  const renderer = new Renderer({ canvas, width, height });
  const mesh = new Mesh(new BoxGeometry(2, 2, 2), Mesh.LambertMaterial({ color: 0xaaaaaa }));
  scene.add(mesh);
  const clock = 0;
  const animate = () => {
    clock += 0.01;
    mesh.rotation.x = clock;
    mesh.rotation.y = clock * 0.5;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();
  return { cleanup: () => {} };
}

export const example = { meta, controls, setup };
