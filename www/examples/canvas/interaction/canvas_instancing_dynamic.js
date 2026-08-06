import { BoxGeometry, Color, InstancedMesh, LambertMaterial } from "@/index.js";
import {
  createScene,
  instanceMatrix,
  runLoop,
} from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_instancing_dynamic",
  name: "Dynamic Instancing",
  category: "canvas",
  description:
    "CPU instancing updates transforms, active count, and per-instance colors every frame; GPU-only WebGL buffers are replaced with InstancedMesh storage.",
};

/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "slider",
    key: "count",
    label: "Instances",
    min: 4,
    max: 64,
    step: 4,
    default: 36,
  },
];

export function setup(canvas, params = {}) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [6, 5, 10],
    target: [0, 0, 0],
  });
  const geometry = new BoxGeometry(0.65, 0.65, 0.65);
  const material = new LambertMaterial({ color: 0xffffff });
  const mesh = new InstancedMesh(geometry, material, 64);
  scene.add(mesh);

  let activeCount = Math.max(4, Math.min(64, Number(params.count ?? 36)));
  mesh.count = activeCount;
  const colors = [0xe36b6b, 0x5da8e8, 0xe6b85c, 0x71c68b];
  for (let index = 0; index < 64; index++) {
    const column = index % 8;
    const row = Math.floor(index / 8);
    mesh.setColorAt(index, new Color(colors[index % colors.length]));
    mesh.setMatrixAt(
      index,
      instanceMatrix([column - 3.5, 0, row - 3.5], 0, 0.75),
    );
  }

  const instance = runLoop(renderer, scene, camera, (time) => {
    for (let index = 0; index < activeCount; index++) {
      const column = index % 8;
      const row = Math.floor(index / 8);
      const wave = Math.sin(time * 2 + column * 0.6 + row * 0.4);
      const scale = 0.55 + (wave + 1) * 0.1;
      mesh.setMatrixAt(
        index,
        instanceMatrix(
          [column - 3.5, wave * 0.65, row - 3.5],
          time * 0.8 + index * 0.07,
          scale,
        ),
      );
    }
    mesh.count = activeCount;
  });
  return {
    ...instance,
    update(nextParams = {}) {
      activeCount = Math.max(
        4,
        Math.min(64, Number(nextParams.count ?? activeCount)),
      );
      mesh.count = activeCount;
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const mesh = new EASEL.InstancedMesh(geometry, material, 64);
mesh.setMatrixAt(index, matrix);
mesh.setColorAt(index, new EASEL.Color(0x5da8e8));
mesh.count = activeCount;`;

export const threeSource = `import * as THREE from "three";

const mesh = new THREE.InstancedMesh(geometry, material, 64);
mesh.setMatrixAt(index, matrix);
mesh.setColorAt(index, new THREE.Color(0x5da8e8));
mesh.count = activeCount;`;

export const example = { meta, controls, setup, easelSource, threeSource };
