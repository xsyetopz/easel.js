import * as EASEL from "@/index.js";
import { texturePath } from "../assets.js";

export const meta = {
  id: "texture-mapping",
  name: "Texture Mapping",
  category: "textures",
  description: "UV mapping on a box using TextureLoader with LambertMaterial.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;

  const scene = new EASEL.Scene();
  const camera = new EASEL.PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1, 5);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.5));
  const light = new EASEL.DirectionalLight(0xffffff, 0.8);
  light.position.set(4, 6, 5);
  scene.add(light);

  const material = new EASEL.LambertMaterial({ color: 0xffffff });
  const box = new EASEL.Mesh(new EASEL.BoxGeometry(2, 2, 2), material);
  scene.add(box);

  const loader = new EASEL.TextureLoader();
  loader.load(
    texturePath("Brick_01.png"),
    (texture) => {
      material.map = texture;
    },
    undefined,
    (err) => console.error("Texture load failed:", err),
  );

  const clock = new EASEL.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.delta;
    box.rotation.x += 0.3 * dt;
    box.rotation.y += 0.5 * dt;
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 45,
  aspect: width / height,
  near: 0.1,
  far: 100,
});
camera.position.set(0, 1, 5);
camera.lookAt(new EASEL.Vector3(0, 0, 0));

const renderer = new EASEL.Renderer({ canvas, width, height });

scene.add(new EASEL.AmbientLight(0xffffff, 0.5));
const light = new EASEL.DirectionalLight(0xffffff, 0.8);
light.position.set(4, 6, 5);
scene.add(light);

const material = new EASEL.LambertMaterial({ color: 0xffffff });
const box = new EASEL.Mesh(new EASEL.BoxGeometry(2, 2, 2), material);
scene.add(box);

const loader = new EASEL.TextureLoader();
	loader.load("/textures/Brick_01.png", (texture) => {
  material.map = texture;
});

const clock = new EASEL.Clock();
function animate() {
  requestAnimationFrame(animate);
  box.rotation.x += 0.3 * clock.delta;
  box.rotation.y += 0.5 * clock.delta;
  renderer.render(scene, camera);
}
animate();`;

export const threeSource = `import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  width / height,
  0.1,
  100,
);
camera.position.set(0, 1, 5);
camera.lookAt(new THREE.Vector3(0, 0, 0));

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(width, height);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(4, 6, 5);
scene.add(light);

const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material);
scene.add(box);

const loader = new THREE.TextureLoader();
	loader.load("/textures/Brick_01.png", (texture) => {
  material.map = texture;
  material.needsUpdate = true;
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  box.rotation.x += 0.3 * clock.getDelta();
  box.rotation.y += 0.5 * clock.getDelta();
  renderer.render(scene, camera);
}
animate();`;
