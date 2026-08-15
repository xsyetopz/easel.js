import {
  BoxGeometry,
  FirstPersonControls,
  LambertMaterial,
  Mesh,
} from "@/index.js";
import { createClickActivatedControls } from "../../runtime/canvas-input-focus.ts";
import {
  createScene,
  runLoop,
} from "../canvas/interaction/canvas_interaction_helpers.js";

export const meta = {
  id: "first-person-walkthrough",
  name: "First-Person Walkthrough",
  category: "interaction",
  animated: true,
  description:
    "Click to lock the pointer, then use WASD and the mouse to explore a compact corridor.",
};

export const controls = [];

function createBlockFactory(scene) {
  const geometries = new Map();
  const materials = new Map();

  return {
    add(size, position, color) {
      const geometryKey = size.join(":");
      let geometry = geometries.get(geometryKey);
      if (!geometry) {
        geometry = new BoxGeometry(...size);
        geometries.set(geometryKey, geometry);
      }
      let material = materials.get(color);
      if (!material) {
        material = new LambertMaterial({ color });
        materials.set(color, material);
      }
      const block = new Mesh(geometry, material);
      block.position.set(...position);
      scene.add(block);
    },
    dispose() {
      for (const geometry of geometries.values()) geometry.dispose();
      for (const material of materials.values()) material.dispose();
    },
  };
}

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [0, 1.7, 8],
    target: [0, 1.7, 0],
    background: 0x080b12,
    fov: 58,
  });
  const cameraInput = createClickActivatedControls(canvas, () => {
    const controls = new FirstPersonControls(camera, canvas);
    controls.movementSpeed = 3;
    controls.lookSpeed = 0.0025;
    return controls;
  });

  const blocks = createBlockFactory(scene);
  const tileSize = 2.5;
  for (let zIndex = 0; zIndex < 12; zIndex++) {
    const z = 8.75 - zIndex * tileSize;
    const wallColor = zIndex % 2 === 0 ? 0x5b3232 : 0x643838;
    blocks.add([0.3, 4, 2.52], [-5, 2, z], wallColor);
    blocks.add([0.3, 4, 2.52], [5, 2, z], wallColor);
    for (let xIndex = 0; xIndex < 4; xIndex++) {
      const x = -3.75 + xIndex * tileSize;
      const checker = (xIndex + zIndex) % 2;
      blocks.add(
        [2.52, 0.2, 2.52],
        [x, -0.1, z],
        checker ? 0x383d47 : 0x30353e,
      );
      blocks.add([2.52, 0.2, 2.52], [x, 4.1, z], checker ? 0x242932 : 0x1d222a);
    }
  }
  for (let xIndex = 0; xIndex < 4; xIndex++) {
    const x = -3.75 + xIndex * tileSize;
    blocks.add([2.52, 4, 0.3], [x, 2, -20], 0x292f3a);
  }

  for (let z = 5; z >= -16; z -= 4.2) {
    blocks.add([0.7, 3.6, 0.7], [-3.8, 1.8, z], 0x77705f);
    blocks.add([0.7, 3.6, 0.7], [3.8, 1.8, z], 0x77705f);
  }
  for (let index = 0; index < 6; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    blocks.add(
      [1.2, 1.2, 1.2],
      [side * 2.2, 0.6, 2 - index * 3.2],
      index % 3 === 0 ? 0xc28a45 : 0x4b768c,
    );
  }

  return runLoop(
    renderer,
    scene,
    camera,
    (_time, delta) => cameraInput.controls.update(delta),
    [() => cameraInput.dispose(), () => blocks.dispose()],
  );
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const controls = new EASEL.FirstPersonControls(camera, renderer.domElement);
controls.movementSpeed = 3;
controls.lookSpeed = 0.0025;
controls.update(delta);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
