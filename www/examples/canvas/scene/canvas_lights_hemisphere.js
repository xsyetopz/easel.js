import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  HemisphereLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_lights_hemisphere",
  name: "Hemisphere Lighting",
  category: "canvas",
  description:
    "A CPU HemisphereLight shades authored primitives in a small outdoor stage without GLTF, shader sky, or shadow maps.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x8fc7eb;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(5, 4, 8);
  camera.lookAt(new Vector3(0, 1, 0));
  const renderer = new Renderer({ canvas, width, height });

  scene.add(new HemisphereLight(0x9edcff, 0x493c37, 1.05));
  scene.add(new AmbientLight(0xffffff, 0.12));
  const sun = new DirectionalLight(0xfff5d6, 0.55);
  sun.position.set(4, 7, 3);
  scene.add(sun);
  const ground = new Mesh(
    new PlaneGeometry(14, 14),
    new LambertMaterial({ color: 0x6b925a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;
  scene.add(ground);

  const props = [
    [new SphereGeometry(1.05, 18, 12), 0xe86d59, -2.1, 0],
    [new BoxGeometry(1.6, 1.6, 1.6), 0x5b9cd4, 0.2, 0],
    [new SphereGeometry(0.85, 16, 10), 0xf3c65d, 2.3, 0],
  ].map(([geometry, color, x]) => {
    const mesh = new Mesh(geometry, new LambertMaterial({ color }));
    mesh.position.set(x, 0, 0);
    scene.add(mesh);
    return mesh;
  });
  const clock = new Timer();
  let animationFrame;
  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    props.forEach((mesh, index) => {
      mesh.rotation.y += clock.delta * (0.22 + index * 0.08);
      mesh.position.y = Math.sin(clock.elapsedTime * 0.8 + index) * 0.08;
    });
    renderer.prepare(scene, camera);
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

scene.add(new EASEL.HemisphereLight(0x9edcff, 0x493c37, 1.05));
scene.add(new EASEL.Mesh(new EASEL.SphereGeometry(1.05, 18, 12),
  new EASEL.LambertMaterial({ color: 0xe86d59 })));`;

export const threeSource = `import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

scene.add(new THREE.HemisphereLight(0x9edcff, 0x493c37, 1.05));
new GLTFLoader().load("landscape.glb", (gltf) => scene.add(gltf.scene));
renderer.shadowMap.enabled = true;`;

export const example = { meta, controls, setup, easelSource, threeSource };
