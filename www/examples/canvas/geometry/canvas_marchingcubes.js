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
  id: "webgl_marchingcubes",
  name: "CPU Isosurface",
  category: "canvas",
  description:
    "An authored sampled sphere emits exposed voxel faces as a bounded CPU isosurface, replacing the unavailable GPU MarchingCubes helper.",
};

export const controls = [];

function makeSurface() {
  const positions = [];
  const normals = [];
  const indices = [];
  const radius = 4.4;
  const scale = 0.36;
  const inside = (x, y, z) => x * x + y * y + z * z < radius * radius;
  const addFace = (x, y, z, normal, corners) => {
    const base = positions.length / 3;
    for (const [cx, cy, cz] of corners) {
      positions.push((x + cx) * scale, (y + cy) * scale, (z + cz) * scale);
      normals.push(normal[0], normal[1], normal[2]);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const faces = [
    {
      offset: [1, 0, 0],
      normal: [1, 0, 0],
      corners: [
        [1, 0, 0],
        [1, 0, 1],
        [1, 1, 1],
        [1, 1, 0],
      ],
    },
    {
      offset: [-1, 0, 0],
      normal: [-1, 0, 0],
      corners: [
        [0, 0, 1],
        [0, 0, 0],
        [0, 1, 0],
        [0, 1, 1],
      ],
    },
    {
      offset: [0, 1, 0],
      normal: [0, 1, 0],
      corners: [
        [0, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
        [0, 1, 0],
      ],
    },
    {
      offset: [0, -1, 0],
      normal: [0, -1, 0],
      corners: [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
        [0, 0, 1],
      ],
    },
    {
      offset: [0, 0, 1],
      normal: [0, 0, 1],
      corners: [
        [1, 0, 1],
        [0, 0, 1],
        [0, 1, 1],
        [1, 1, 1],
      ],
    },
    {
      offset: [0, 0, -1],
      normal: [0, 0, -1],
      corners: [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    },
  ];
  for (let x = -6; x <= 6; x++) {
    for (let y = -6; y <= 6; y++) {
      for (let z = -6; z <= 6; z++) {
        if (!inside(x, y, z)) continue;
        for (const face of faces) {
          if (
            !inside(x + face.offset[0], y + face.offset[1], z + face.offset[2])
          ) {
            addFace(x, y, z, face.normal, face.corners);
          }
        }
      }
    }
  }
  const geometry = new Geometry();
  geometry.setPositions(new Float32Array(positions));
  geometry.setNormals(new Float32Array(normals));
  geometry.index = indices;
  geometry.computeBoundingSphere();
  return geometry;
}

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x0f1725;
  const camera = new PerspectiveCamera({
    fov: 44,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 2.7, 8.2);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.95);
  light.position.set(4, 6, 6);
  scene.add(light);
  const mesh = new Mesh(
    makeSurface(),
    new LambertMaterial({ color: 0x61b8d8 }),
  );
  scene.add(mesh);
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    mesh.rotation.y += clock.update().delta * 0.3;
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
geometry.setPositions(positions);
geometry.setNormals(normals);
geometry.index = indices;`;

export const threeSource = `import * as THREE from "three";

import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";

const effect = new MarchingCubes(32, material, true, true);
effect.addBall(0.5, 0.5, 0.5, 0.5, 12);`;

export const example = { meta, controls, setup, easelSource, threeSource };
