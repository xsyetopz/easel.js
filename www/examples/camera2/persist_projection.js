import {
  AmbientLight,
  BasicMaterial,
  BoxGeometry,
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
  id: "camera_persist_projection",
  name: "Persist Projection (Canvas2D)",
  category: "camera2",
  description:
    "CPU scanline scorch-persist last committed position. Toggle to save and restore camera distance.",
  gpuOnly: false,
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = new Color(0x111824);
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(10, 0, 10);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });

  scene.add(new AmbientLight(0xffffff, 0.4));
  const key = new DirectionalLight(0xffffff, 0.8);
  key.position.set(4, 5, 6);
  scene.add(key);

  const cube = new Mesh(
    new BoxGeometry(2, 2, 2),
    new BasicMaterial({ color: 0x4fc1e8 }),
  );
  scene.add(cube);

  const clock = new Timer();
  let animationFrame;
  let yaw = Math.atan2(10, 10);
  const pitch = 0;
  const distance = Math.sqrt(10 ** 2 + 10 ** 2);

  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    yaw += clock.delta * 0.3;
    cube.rotation.y = yaw;
    cube.rotation.x = yaw * 0.5;
    camera.position.x = Math.sin(yaw) * Math.cos(pitch) * distance;
    camera.position.y = Math.sin(pitch) * distance;
    camera.position.z = Math.cos(yaw) * Math.cos(pitch) * distance;
    camera.lookAt(new Vector3(0, 0, 0));
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
$// Camera gesture projection setup
const camera = new EASEL.PerspectiveCamera({ fov: 45 });`;

export const threeSource = `import * as THREE from "three";
$// Camera gesture projection setup
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);`;

export const example = { meta, controls, setup, easelSource, threeSource };
