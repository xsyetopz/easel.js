import {
  BasicMaterial,
  Geometry,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_buffergeometry_attributes_none",
  name: "Position-Only Geometry",
  category: "canvas",
  description:
    "A minimal indexed Geometry intentionally omits normals, UVs, and colors to show the CPU unlit fallback.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x0d1320;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.4, 6);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const geometry = new Geometry();
  geometry.setPositions([
    -1.5, -1.1, 0, 1.5, -1.1, 0, 1.5, 1.1, 0, -1.5, 1.1, 0, 0, 0, 1.6,
  ]);
  geometry.index = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4];
  geometry.computeBoundingSphere();
  const mesh = new Mesh(geometry, new BasicMaterial({ color: 0x4fc1e8 }));
  scene.add(mesh);
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    mesh.rotation.y += clock.update().delta * 0.5;
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

const geometry = new EASEL.Geometry();
geometry.setPositions(vertices);
geometry.index = indices;
const mesh = new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ color: 0x4fc1e8 }));`;

export const threeSource = `import * as THREE from "three";

const geometry = new THREE.BufferGeometry();
geometry.setDrawRange(0, vertexCount);
const material = new THREE.RawShaderMaterial({
  uniforms: { seed: { value: 42 } },
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
  glslVersion: THREE.GLSL3,
});
const mesh = new THREE.Mesh(geometry, material);`;

export const example = { meta, controls, setup, easelSource, threeSource };
