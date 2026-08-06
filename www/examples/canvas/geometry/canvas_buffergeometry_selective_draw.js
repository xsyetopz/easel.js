import {
  AmbientLight,
  BoxGeometry,
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
  id: "webgl_buffergeometry_selective_draw",
  name: "Selective Draw",
  category: "canvas",
  description:
    "Three submeshes share one CPU geometry and toggle visible ranges, providing a Canvas2D equivalent to selective GPU draws.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x121825;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 2.8, 9.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.4));
  const sun = new DirectionalLight(0xffffff, 0.9);
  sun.position.set(4, 5, 6);
  scene.add(sun);
  const geometry = new BoxGeometry(0.72, 0.72, 0.72);
  geometry.computeBoundingSphere();
  const colors = [0xe86f68, 0x69b4e3, 0xe7bd65];
  const meshes = colors.map((color, index) => {
    const mesh = new Mesh(geometry, new LambertMaterial({ color }));
    mesh.position.set((index - 1) * 1.8, 0, 0);
    scene.add(mesh);
    return mesh;
  });
  let elapsed = 0;
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    const delta = clock.update().delta;
    elapsed += delta;
    const active = Math.floor(elapsed * 1.4) % meshes.length;
    meshes.forEach((mesh, index) => {
      mesh.visible = index === active || Math.sin(elapsed * 2 + index) > 0.35;
    });
    for (const mesh of meshes) mesh.rotation.y += delta * 0.25;
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

for (const draw of draws) draw.visible = draw.range.includes(index);
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";

for (const draw of draws) draw.visible = draw.range.includes(index);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
