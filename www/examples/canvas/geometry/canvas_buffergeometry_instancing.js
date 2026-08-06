import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  InstancedMesh,
  LambertMaterial,
  Matrix4,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_buffergeometry_instancing",
  name: "CPU Instancing",
  category: "canvas",
  description:
    "InstancedMesh stores transforms and colors in CPU arrays while the Canvas2D renderer expands each visible instance.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x121a2a;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 3, 11);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const sun = new DirectionalLight(0xffffff, 0.95);
  sun.position.set(3, 6, 7);
  scene.add(sun);
  const geometry = new BoxGeometry(0.55, 0.55, 0.55);
  geometry.computeBoundingSphere();
  const mesh = new InstancedMesh(
    geometry,
    new LambertMaterial({ color: 0xffffff }),
    48,
  );
  const matrix = new Matrix4();
  for (let i = 0; i < mesh.count; i++) {
    const x = (i % 8) - 3.5;
    const z = Math.floor(i / 8) - 2.5;
    matrix.makeTranslation(x * 0.9, Math.sin(i * 0.7) * 0.35, z * 0.9);
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, new Color().setHSL((i % 8) / 8, 0.65, 0.55));
  }
  mesh.computeBoundingSphere();
  scene.add(mesh);
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    const delta = clock.update().delta;
    mesh.rotation.y += delta * 0.28;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      mesh.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const mesh = new EASEL.InstancedMesh(geometry, material, 48);
mesh.setMatrixAt(index, matrix);
mesh.setColorAt(index, color);`;

export const threeSource = `import * as THREE from "three";

const mesh = new THREE.InstancedMesh(geometry, material, 48);
mesh.setMatrixAt(index, matrix);
mesh.setColorAt(index, color);`;

export const example = { meta, controls, setup, easelSource, threeSource };
