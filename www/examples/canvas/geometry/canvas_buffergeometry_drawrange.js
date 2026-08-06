import {
  AmbientLight,
  DirectionalLight,
  Geometry,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_buffergeometry_drawrange",
  name: "Dynamic Draw Range",
  category: "canvas",
  description:
    "A CPU index slice animates the visible triangle range, preserving draw-range semantics without GPU buffer calls.",
};

export const controls = [];

function makeStrip() {
  const geometry = new Geometry();
  const positions = [];
  const indices = [];
  for (let i = 0; i <= 18; i++) {
    const x = -3.2 + i * 0.36;
    positions.push(x, Math.sin(i * 0.65) * 0.85, Math.cos(i * 0.35) * 0.3);
    if (i >= 2) {
      const a = i - 2;
      const b = i - 1;
      const c = i;
      indices.push(a, b, c);
    }
  }
  geometry.setPositions(positions);
  geometry.index = indices;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { geometry, indices };
}

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x111827;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1.1, 8.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.4));
  const sun = new DirectionalLight(0xffffff, 0.9);
  sun.position.set(2, 4, 5);
  scene.add(sun);
  const strip = makeStrip();
  const mesh = new Mesh(
    strip.geometry,
    new LambertMaterial({ color: 0x9bd0ed }),
  );
  scene.add(mesh);
  let elapsed = 0;
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    const delta = clock.update().delta;
    elapsed += delta;
    const triangleCount =
      1 +
      Math.floor(
        (Math.sin(elapsed * 1.7) * 0.5 + 0.5) * (strip.indices.length / 3 - 1),
      );
    strip.geometry.setDrawRange(0, triangleCount * 3);
    mesh.rotation.y += delta * 0.2;
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

geometry.setDrawRange(0, triangleCount * 3);`;

export const threeSource = `import * as THREE from "three";


geometry.setDrawRange(0, triangleCount * 3);`;

export const example = { meta, controls, setup, easelSource, threeSource };
