import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "voxel-level",
  name: "Voxel Level",
  category: "worlds",
  animated: true,
  description: "Build a small blockout from reusable voxel materials.",
};

export const controls = [];

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
  camera.position.set(7, 6.5, 9);
  camera.lookAt(new Vector3(0, 0.6, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.45));
  const light = new DirectionalLight(0xffffff, 0.85);
  light.position.set(4, 8, 6);
  scene.add(light);
  const world = new Group();
  scene.add(world);
  const cube = new BoxGeometry(0.9, 0.9, 0.9);
  cube.computeBoundingSphere();
  const materials = {
    grass: new LambertMaterial({ color: 0x6fae4d }),
    dirt: new LambertMaterial({ color: 0x8f633b }),
    roof: new LambertMaterial({ color: 0xb54e46 }),
    wood: new LambertMaterial({ color: 0xb98b55 }),
  };
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      const heightAt = Math.max(
        0,
        Math.floor(1.5 + Math.sin(x * 0.9) * 0.8 + Math.cos(z * 0.8) * 0.7),
      );
      for (let y = 0; y <= heightAt; y++) {
        const block = new Mesh(
          cube,
          y === heightAt ? materials.grass : materials.dirt,
        );
        block.position.set(x * 0.92, y * 0.9 - 0.8, z * 0.92);
        world.add(block);
      }
    }
  }
  for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
      const roof = new Mesh(cube, materials.roof);
      roof.position.set(x * 0.92, 1.9, z * 0.92);
      roof.scale.set(1, 0.45, 1);
      world.add(roof);
    }
  }
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    world.rotation.y += clock.update().delta * 0.12;
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
world.add(new EASEL.Mesh(sharedCube, grassMaterial));`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
