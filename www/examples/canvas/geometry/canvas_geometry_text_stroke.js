import {
  AmbientLight,
  DirectionalLight,
  Geometry,
  LineMaterial,
  LineSegments,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_geometry_text_stroke",
  name: "Text Stroke",
  category: "canvas",
  description:
    "A hand-authored stroke table renders CPU LineSegments for the word EASEL instead of a font loader or GPU line shader.",
};

export const controls = [];

function makeStroke() {
  const geometry = new Geometry();
  const positions = [];
  const glyphs = {
    E: [
      [0, 0, 0, 1],
      [0, 1, 0.65, 1],
      [0, 0.5, 0.5, 0.5],
      [0, 0, 0.65, 0],
    ],
    A: [
      [0, 0, 0.35, 1],
      [0.35, 1, 0.7, 0],
      [0.15, 0.42, 0.55, 0.42],
    ],
    S: [
      [0.65, 1, 0, 1],
      [0, 1, 0, 0.5],
      [0, 0.5, 0.65, 0.5],
      [0.65, 0.5, 0.65, 0],
      [0.65, 0, 0, 0],
    ],
    L: [
      [0, 1, 0, 0],
      [0, 0, 0.65, 0],
    ],
  };
  const text = "EASEL";
  for (let letter = 0; letter < text.length; letter++) {
    const segments = glyphs[text[letter]] ?? glyphs.E;
    for (const [x1, y1, x2, y2] of segments) {
      const x = -2.6 + letter * 1.25;
      positions.push(x + x1, y1 - 0.5, 0, x + x2, y2 - 0.5, 0);
    }
  }
  geometry.setPositions(positions);
  geometry.computeBoundingSphere();
  return geometry;
}

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x111827;
  const camera = new PerspectiveCamera({
    fov: 40,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.1, 7.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.6));
  const light = new DirectionalLight(0xffffff, 0.8);
  light.position.set(2, 4, 6);
  scene.add(light);
  const line = new LineSegments(
    makeStroke(),
    new LineMaterial({ color: 0x61c9e7, linewidth: 2 }),
  );
  scene.add(line);
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    line.rotation.y += clock.update().delta * 0.2;
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

const stroke = new EASEL.Geometry();
stroke.setPositions(strokeVertices);
const line = new EASEL.LineSegments(stroke, new EASEL.LineMaterial({ linewidth: 2 }));`;

export const threeSource = `import * as THREE from "three";

const stroke = new THREE.BufferGeometry().setFromPoints(points);
const line = new THREE.LineSegments(stroke, new THREE.LineBasicMaterial());`;

export const example = { meta, controls, setup, easelSource, threeSource };
