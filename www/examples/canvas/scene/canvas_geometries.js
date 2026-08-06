import {
  AmbientLight,
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  IcosahedronGeometry,
  LambertMaterial,
  Mesh,
  OctahedronGeometry,
  PerspectiveCamera,
  Renderer,
  Scene,
  SphereGeometry,
  TetrahedronGeometry,
  Timer,
  TorusGeometry,
  TorusKnotGeometry,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_geometries",
  name: "Geometry Gallery",
  category: "canvas",
  description:
    "A CPU geometry gallery replaces the source Phong/repeated-texture grid with lit EASEL primitives.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101522;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 11);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const key = new DirectionalLight(0xffffff, 0.95);
  key.position.set(4, 6, 8);
  scene.add(key);

  const definitions = [
    [new BoxGeometry(1.25, 1.25, 1.25), 0xe46d62],
    [new SphereGeometry(0.78, 18, 12), 0x56a6d9],
    [new ConeGeometry(0.78, 1.45, 18), 0xf1bc58],
    [new CylinderGeometry(0.65, 0.86, 1.35, 18), 0x8fd080],
    [new TorusGeometry(0.62, 0.22, 12, 20), 0xc983d1],
    [new TorusKnotGeometry(0.64, 0.2, 32, 8), 0xd88755],
    [new IcosahedronGeometry(0.86, 1), 0x82c1ce],
    [new DodecahedronGeometry(0.86, 1), 0xef8c9d],
    [new OctahedronGeometry(0.9, 1), 0xb6a3e5],
    [new TetrahedronGeometry(0.98, 1), 0xf0d06a],
    [new CapsuleGeometry(0.52, 0.66, 8, 14), 0x79c4a4],
    [new SphereGeometry(0.72, 10, 8), 0xf29c5f],
  ];
  const meshes = definitions.map(([geometry, color], index) => {
    const mesh = new Mesh(geometry, new LambertMaterial({ color }));
    mesh.position.set(
      ((index % 4) - 1.5) * 2.05,
      (Math.floor(index / 4) - 1) * 2.05,
      0,
    );
    scene.add(mesh);
    return mesh;
  });

  const clock = new Timer();
  let animationFrame;
  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    for (const [index, mesh] of meshes.entries()) {
      mesh.rotation.x += clock.delta * (0.25 + index * 0.015);
      mesh.rotation.y += clock.delta * (0.4 + index * 0.02);
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

const mesh = new EASEL.Mesh(new EASEL.TorusKnotGeometry(0.64, 0.2, 32, 8),
  new EASEL.LambertMaterial({ color: 0xd88755 }));
scene.add(mesh);
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";

const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.64, 0.2, 32, 8),
  new THREE.MeshPhongMaterial({ color: 0xd88755, map: repeatedTexture }));
scene.add(mesh);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
