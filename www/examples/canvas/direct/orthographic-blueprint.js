import {
  Color,
  Geometry,
  GridHelper,
  LineMaterial,
  LineSegments,
  MapControls,
  OrthographicCamera,
  Renderer,
  Scene,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { aimCamera } from "../../../runtime/example-camera.ts";

export const meta = {
  id: "orthographic-blueprint",
  name: "Orthographic Blueprint",
  category: "interaction",
  animated: true,
  description:
    "Pan and zoom a layered floor plan with openings, fixtures, and dimensions.",
};
export const controls = [];

function makeLayer(segments, y, color, linewidth = 1) {
  const positions = segments.flatMap(([x1, z1, x2, z2]) => [
    x1,
    y,
    z1,
    x2,
    y,
    z2,
  ]);
  const geometry = new Geometry().setPositions(positions);
  const material = new LineMaterial({ color, linewidth });
  return new LineSegments(geometry, material);
}

function rectangle(x1, z1, x2, z2) {
  return [
    [x1, z1, x2, z1],
    [x2, z1, x2, z2],
    [x2, z2, x1, z2],
    [x1, z2, x1, z1],
  ];
}

function arc(cx, cz, radius, start, end, steps = 8) {
  const segments = [];
  for (let index = 0; index < steps; index++) {
    const a = start + ((end - start) * index) / steps;
    const b = start + ((end - start) * (index + 1)) / steps;
    segments.push([
      cx + Math.cos(a) * radius,
      cz + Math.sin(a) * radius,
      cx + Math.cos(b) * radius,
      cz + Math.sin(b) * radius,
    ]);
  }
  return segments;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = new Color(0x0d1a28);
  const aspect = width / height;
  const camera = new OrthographicCamera({
    left: -6.8 * aspect,
    right: 6.8 * aspect,
    top: 6.8,
    bottom: -6.8,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 8, 0.01);
  aimCamera(camera, new Vector3());
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new GridHelper(16, 32, 0x21455d, 0x142d3e));

  const walls = [
    ...rectangle(-5, -3.4, 5, 3.4),
    ...rectangle(-4.82, -3.22, 4.82, 3.22),
    [-1.2, -3.22, -1.2, -0.7],
    [-1.2, 0.5, -1.2, 3.22],
    [-1.02, -3.22, -1.02, -0.7],
    [-1.02, 0.5, -1.02, 3.22],
    [-1.02, 0.9, 1.4, 0.9],
    [2.6, 0.9, 4.82, 0.9],
    [-1.02, 1.08, 1.4, 1.08],
    [2.6, 1.08, 4.82, 1.08],
  ];
  const openings = [
    [-3.8, -3.28, -2.2, -3.28],
    [1.4, 3.28, 3.2, 3.28],
    [-1.12, -0.7, -0.25, -0.7],
    [-1.12, 0.5, -0.25, 0.5],
    [1.4, 0.99, 2.6, 0.99],
  ];
  const doors = [
    [-1.12, -0.7, -0.25, -0.7],
    ...arc(-1.12, -0.7, 0.87, 0, Math.PI / 2),
    [1.4, 0.99, 1.4, 2.19],
    ...arc(1.4, 0.99, 1.2, 0, Math.PI / 2),
  ];
  const fixtures = [
    ...rectangle(-4.2, -2.4, -2.1, -1.1),
    ...rectangle(-3.95, -2.15, -2.35, -1.35),
    ...rectangle(0.0, -2.4, 3.8, -1.45),
    ...rectangle(2.9, 1.65, 4.15, 2.65),
    ...rectangle(-4.2, 1.45, -2.25, 2.65),
    [-3.22, 1.45, -3.22, 2.65],
    [-4.2, 2.05, -2.25, 2.05],
  ];
  const dimensions = [
    [-5, -4.1, 5, -4.1],
    [-5, -4.35, -5, -3.75],
    [5, -4.35, 5, -3.75],
    [-5.12, -4.22, -4.88, -3.98],
    [4.88, -4.22, 5.12, -3.98],
    [-5.75, -3.4, -5.75, 3.4],
    [-6, -3.4, -5.5, -3.4],
    [-6, 3.4, -5.5, 3.4],
    [-5.87, -3.52, -5.63, -3.28],
    [-5.87, 3.28, -5.63, 3.52],
  ];
  const symbols = [
    [5.9, 1.8, 5.9, 3.05],
    [5.9, 3.05, 5.55, 2.5],
    [5.9, 3.05, 6.25, 2.5],
    [5.45, 1.8, 6.35, 1.8],
    [5.4, -2.7, 6.4, -2.7],
    [5.4, -2.58, 5.4, -2.82],
    [5.9, -2.58, 5.9, -2.82],
    [6.4, -2.58, 6.4, -2.82],
    ...rectangle(3.15, -4.9, 6.45, -3.85),
    [3.15, -4.35, 6.45, -4.35],
    [5.1, -4.9, 5.1, -3.85],
  ];
  const layers = [
    makeLayer(walls, 0.06, 0x9cddff, 3),
    makeLayer(openings, 0.07, 0x5bc0e7, 3),
    makeLayer(doors, 0.08, 0x75c9ea, 1),
    makeLayer(fixtures, 0.09, 0x4e91b2, 1),
    makeLayer(dimensions, 0.1, 0xffc96b, 1),
    makeLayer(symbols, 0.11, 0xffc96b, 2),
  ];
  scene.add(...layers);
  const controls = new MapControls(camera, canvas);
  controls.enableRotate = false;
  controls.target.set(0, 0, 0);
  controls.minZoom = 0.7;
  controls.maxZoom = 4;
  const animation = createExampleAnimationLoop(() => {
    controls.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      controls.dispose();
      layers.forEach((layer) => {
        layer.geometry.dispose();
        layer.material.dispose();
      });
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const camera = new EASEL.OrthographicCamera({ left, right, top, bottom });
const controls = new EASEL.MapControls(camera, canvas);
controls.enableRotate = false;
controls.minZoom = 0.7;
controls.maxZoom = 4;
scene.add(walls, openings, fixtures, dimensions);`;
export const example = { meta, controls, setup, easelSource };
