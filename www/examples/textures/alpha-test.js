import * as EASEL from "@/index.js";
import { texturePath } from "../assets.js";

export const meta = {
  id: "alpha-test",
  name: "Alpha Test",
  category: "textures",
  description: "Glass texture with binary alpha transparency.",
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
  camera.position.set(2, 1.5, 5);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.5));
  const light = new EASEL.DirectionalLight(0xffffff, 0.8);
  light.position.set(4, 6, 5);
  scene.add(light);

  const brickMat = new EASEL.LambertMaterial({ color: 0xffffff });
  const brickBox = new EASEL.Mesh(new EASEL.BoxGeometry(2, 2, 2), brickMat);
  brickBox.position.x = 1.5;
  scene.add(brickBox);

  const glassMat = new EASEL.LambertMaterial({ color: 0xffffff });
  const glassBox = new EASEL.Mesh(new EASEL.BoxGeometry(2, 2, 2), glassMat);
  glassBox.position.x = -1;
  scene.add(glassBox);

  const loader = new EASEL.TextureLoader();
  loader.load(texturePath("Brick_01.png"), (texture) => {
    brickMat.map = texture;
  });
  loader.load(texturePath("Glass_01.png"), (texture) => {
    glassMat.map = texture;
  });

  const clock = new EASEL.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.delta;
    brickBox.rotation.y += 0.3 * dt;
    glassBox.rotation.y += 0.3 * dt;
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
  fov: 45, aspect: width / height, near: 0.1, far: 100,
});

const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.5));

const glassMat = new EASEL.LambertMaterial({ color: 0xffffff });
const glassBox = new EASEL.Mesh(new EASEL.BoxGeometry(2, 2, 2), glassMat);
scene.add(glassBox);

const loader = new EASEL.TextureLoader();
loader.load("/textures/Glass_01.png", (texture) => {
  glassMat.map = texture;
});`;

export const threeSource = `import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(width, height);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const glassMat = new THREE.MeshLambertMaterial({
  color: 0xffffff,
  transparent: true,
  alphaTest: 0.5,
});
const glassBox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), glassMat);
scene.add(glassBox);

const loader = new THREE.TextureLoader();
loader.load("/textures/Glass_01.png", (texture) => {
  glassMat.map = texture;
  glassMat.needsUpdate = true;
});`;
