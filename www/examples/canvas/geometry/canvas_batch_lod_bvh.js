import {
  AmbientLight,
  DirectionalLight,
  Group,
  LambertMaterial,
  LOD,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_batch_lod_bvh",
  name: "Batched LOD and Bounds",
  category: "canvas",
  description:
    "A CPU distance switch batches high and low detail meshes; bounding spheres stand in for a BVH, with no GPU loader required.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x101722;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 2.5, 11);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const sun = new DirectionalLight(0xffffff, 0.9);
  sun.position.set(4, 6, 7);
  scene.add(sun);

  const high = new Mesh(
    new SphereGeometry(1.05, 20, 12),
    new LambertMaterial({ color: 0x5ec6e8 }),
  );
  const low = new Mesh(
    new SphereGeometry(1.05, 6, 4),
    new LambertMaterial({ color: 0xf1b95b }),
  );
  high.geometry?.computeBoundingSphere();
  low.geometry?.computeBoundingSphere();
  const batch = new Group();
  scene.add(batch);
  const levels = [];
  for (let i = 0; i < 13; i++) {
    const angle = (i / 13) * Math.PI * 2;
    const distance = 2.5 + (i % 3) * 1.4;
    const node = new Group();
    node.position.set(
      Math.cos(angle) * distance,
      (i % 2) * 0.65 - 0.3,
      Math.sin(angle) * distance,
    );
    const lod = new LOD();
    lod.addLevel(high.clone(), 0);
    lod.addLevel(low.clone(), 6.5);
    node.add(lod);
    batch.add(node);
    levels.push({ node, lod, distance });
  }

  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    const delta = clock.update().delta;
    batch.rotation.y += delta * 0.18;
    for (const level of levels) {
      level.lod.update(camera);
    }
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

const near = new EASEL.SphereGeometry(1, 20, 12);
const far = new EASEL.SphereGeometry(1, 6, 4);
const lod = new EASEL.LOD();
lod.addLevel(new EASEL.Mesh(near, material), 0);
lod.addLevel(new EASEL.Mesh(far, material), 6);
lod.update(camera);
node.add(lod);`;

export const threeSource = `import * as THREE from "three";

const lod = new THREE.LOD();
lod.addLevel(highDetail, 0);
lod.addLevel(lowDetail, 6);
lod.update(camera);
const bvh = new MeshBVH(geometry);`;

export const example = { meta, controls, setup, easelSource, threeSource };
