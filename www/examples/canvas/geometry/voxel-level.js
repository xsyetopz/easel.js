import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  InstancedMesh,
  LambertMaterial,
  Matrix4,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { aimCamera } from "../../../runtime/example-camera.ts";

export const meta = {
  id: "voxel-level",
  name: "Voxel Level",
  category: "worlds",
  animated: true,
  description:
    "Batch a small island, path, pond, and watchtower by voxel material.",
};
export const controls = [];

function addBatch(group, geometry, color, positions) {
  const material = new LambertMaterial({ color });
  const mesh = new InstancedMesh(geometry, material, positions.length);
  positions.forEach(([x, y, z], index) => {
    mesh.setMatrixAt(index, new Matrix4().makeTranslation(x, y, z));
  });
  group.add(mesh);
  return { material, mesh };
}

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x9bc5e0;
  const camera = new PerspectiveCamera({
    fov: 44,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(9, 7.5, 11);
  aimCamera(camera, new Vector3(0, 0.8, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.42));
  const light = new DirectionalLight(0xfff1cf, 1.05);
  light.position.set(5, 9, 6);
  scene.add(light);

  const blocks = {
    dirt: [],
    grass: [],
    path: [],
    water: [],
    wood: [],
    roof: [],
  };
  for (let x = -5; x <= 5; x++) {
    for (let z = -4; z <= 4; z++) {
      if ((x / 5.5) ** 2 + (z / 4.5) ** 2 > 1) continue;
      const pond = x >= 2 && x <= 4 && z >= 1 && z <= 3;
      const path = Math.abs(z) <= (x < 0 ? 0 : 1) && !pond;
      const top = Math.abs(x) + Math.abs(z) > 7 ? 0 : 1;
      blocks.dirt.push([x, -0.55, z]);
      if (top > 0) blocks.dirt.push([x, 0.35, z]);
      if (pond) blocks.water.push([x, 1.25, z]);
      else if (path) blocks.path.push([x, top + 0.35, z]);
      else blocks.grass.push([x, top + 0.35, z]);
    }
  }
  for (const [x, z] of [
    [-3, -2],
    [-1, -2],
    [-3, 0],
    [-1, 0],
  ]) {
    for (let y = 1.35; y <= 3.15; y += 0.9) blocks.wood.push([x, y, z]);
  }
  for (let x = -3; x <= -1; x++)
    for (let z = -2; z <= 0; z++) blocks.roof.push([x, 4.05, z]);
  blocks.wood.push([-2, 1.35, -2], [-2, 2.25, -2], [-2, 3.15, -2]);

  const world = new Group();
  scene.add(world);
  const cube = new BoxGeometry(0.88, 0.88, 0.88);
  const batches = [
    addBatch(world, cube, 0x795333, blocks.dirt),
    addBatch(world, cube, 0x68a84c, blocks.grass),
    addBatch(world, cube, 0xc5a36a, blocks.path),
    addBatch(world, cube, 0x4c9bd6, blocks.water),
    addBatch(world, cube, 0x8c5b32, blocks.wood),
    addBatch(world, cube, 0xa8463f, blocks.roof),
  ];
  const clock = new Timer();
  const animation = createExampleAnimationLoop(() => {
    world.rotation.y += clock.update().delta * 0.055;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      cube.dispose();
      batches.forEach(({ material }) => {
        material.dispose();
      });
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const grass = new EASEL.InstancedMesh(sharedCube, grassMaterial, grassBlocks.length);
grassBlocks.forEach((position, index) => {
  grass.setMatrixAt(index, new EASEL.Matrix4().makeTranslation(...position));
});
world.add(grass);`;
export const example = { meta, controls, setup, easelSource };
