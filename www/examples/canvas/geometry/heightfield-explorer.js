import {
  AmbientLight,
  DirectionalLight,
  FirstPersonControls,
  Geometry,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";
import { createClickActivatedControls } from "../../../runtime/canvas-input-focus.ts";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { aimCamera } from "../../../runtime/example-camera.ts";

export const meta = {
  id: "heightfield-explorer",
  name: "Heightfield Explorer",
  category: "worlds",
  animated: true,
  description:
    "Click to lock the pointer, then use WASD and the mouse to explore the terrain.",
};

export const controls = [];

function heightAt(x, z) {
  return (
    Math.sin(x * 0.55) * 0.45 +
    Math.cos(z * 0.7) * 0.3 +
    Math.sin((x + z) * 0.35) * 0.2
  );
}

function makeTerrain(size = 18) {
  const geometry = new Geometry();
  const positions = [];
  const indices = [];
  for (let z = 0; z <= size; z++) {
    for (let x = 0; x <= size; x++) {
      const px = (x - size / 2) * 0.36;
      const pz = (z - size / 2) * 0.36;
      positions.push(px, heightAt(px, pz), pz);
    }
  }
  const row = size + 1;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const a = z * row + x;
      const b = (z + 1) * row + x;
      const c = (z + 1) * row + x + 1;
      const d = z * row + x + 1;
      indices.push(a, d, b, b, d, c);
    }
  }
  geometry.setPositions(positions);
  geometry.index = indices;
  geometry.computeVertexNormals();
  return geometry;
}

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x91bdd5;
  const camera = new PerspectiveCamera({
    fov: 48,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 5.6, 8.5);
  aimCamera(camera, new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const cameraInput = createClickActivatedControls(canvas, () => {
    const controls = new FirstPersonControls(camera, canvas);
    controls.movementSpeed = 2.4;
    controls.lookSpeed = 0.003;
    return controls;
  });
  scene.add(new AmbientLight(0xffffff, 0.45));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 8, 6);
  scene.add(light);
  const terrain = new Mesh(
    makeTerrain(),
    new LambertMaterial({ color: 0x5e9b67, side: 2 }),
  );
  scene.add(terrain);
  const clock = new Timer();
  const animation = createExampleAnimationLoop((_timestamp) => {
    const delta = clock.update().delta;
    cameraInput.controls.update(delta);
    terrain.rotation.y += delta * 0.03;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      cameraInput.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const terrain = new EASEL.Geometry();
terrain.setPositions(heightField);
terrain.index = gridIndices;
terrain.computeVertexNormals();`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
