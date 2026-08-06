import { IcosahedronGeometry, LambertMaterial, Mesh } from "@/index.js";
import { createScene, runLoop } from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_modifier_subdivision",
  name: "Subdivision Modifier",
  category: "canvas",
  description:
    "Side-by-side low and high detail icosahedra show bounded CPU triangle subdivision in place of a WebGL modifier pass.",
};

/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "slider",
    key: "detail",
    label: "Detail",
    min: 0,
    max: 2,
    step: 1,
    default: 1,
  },
];

export function setup(canvas, params = {}) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [4.8, 2.8, 8.4],
    target: [0, 0, 0],
  });
  let detail = Math.max(0, Math.min(2, Number(params.detail ?? 1)));
  const coarse = new Mesh(
    new IcosahedronGeometry(1.35, 0),
    new LambertMaterial({ color: 0xdf786b }),
  );
  coarse.position.x = -1.65;
  const refined = new Mesh(
    new IcosahedronGeometry(1.35, detail + 1),
    new LambertMaterial({ color: 0x5da8e8 }),
  );
  refined.position.x = 1.65;
  scene.add(coarse, refined);

  const instance = runLoop(renderer, scene, camera, (time) => {
    coarse.rotation.y = time * 0.25;
    refined.rotation.y = -time * 0.22;
    refined.rotation.x = time * 0.08;
  });
  return {
    ...instance,
    update(nextParams = {}) {
      const nextDetail = Math.max(
        0,
        Math.min(2, Number(nextParams.detail ?? detail)),
      );
      if (nextDetail === detail) return;
      detail = nextDetail;
      refined.geometry = new IcosahedronGeometry(1.35, detail + 1);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const low = new EASEL.IcosahedronGeometry(1.35, 0);
const high = new EASEL.IcosahedronGeometry(1.35, detail);`;

export const threeSource = `import * as THREE from "three";

const low = new THREE.IcosahedronGeometry(1.35, 0);
const high = new THREE.IcosahedronGeometry(1.35, detail);`;

export const example = { meta, controls, setup, easelSource, threeSource };
