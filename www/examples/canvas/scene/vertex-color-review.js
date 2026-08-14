import {
  AmbientLight,
  BasicMaterial,
  DirectionalLight,
  Geometry,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "vertex-color-review",
  name: "Vertex Color Review",
  category: "materials",
  animated: true,
  description: "Inspect authored vertex colors on a lit mesh.",
};

export const controls = [];

function createColoredCube() {
  const positions = [];
  const colors = [];
  const indices = [];
  const faces = [
    [[0, 0, 1], 0xe85d5d],
    [[0, 0, -1], 0x5d9de8],
    [[0, 1, 0], 0x63c78c],
    [[0, -1, 0], 0xe2b84d],
    [[1, 0, 0], 0xb07be0],
    [[-1, 0, 0], 0xe18a58],
  ];
  for (const [[nx, ny, nz], color] of faces) {
    const corners =
      nz !== 0
        ? [
            [-1, -1, nz],
            [1, -1, nz],
            [1, 1, nz],
            [-1, 1, nz],
          ]
        : nx !== 0
          ? [
              [nx, -1, -1],
              [nx, 1, -1],
              [nx, 1, 1],
              [nx, -1, 1],
            ]
          : [
              [-1, ny, -1],
              [1, ny, -1],
              [1, ny, 1],
              [-1, ny, 1],
            ];
    const base = positions.length / 3;
    for (const [x, y, z] of corners) {
      positions.push(x, y, z);
      const r = ((color >> 16) & 255) / 255;
      const g = ((color >> 8) & 255) / 255;
      const b = (color & 255) / 255;
      colors.push(r, g, b);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new Geometry();
  geometry.setPositions(positions);
  geometry.setColors(colors);
  geometry.index = indices;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101522;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1, 5.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.5));
  const key = new DirectionalLight(0xffffff, 0.85);
  key.position.set(3, 4, 5);
  scene.add(key);

  const cube = new Mesh(
    createColoredCube(),
    new BasicMaterial({ color: 0xffffff, vertexColors: true }),
  );
  scene.add(cube);
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    clock.update(timestamp);
    cube.rotation.x += clock.delta * 0.35;
    cube.rotation.y += clock.delta * 0.55;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
geometry.setColors(faceColors);
geometry.index = faceIndices;
const mesh = new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ color: 0xffffff, vertexColors: true }));`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
