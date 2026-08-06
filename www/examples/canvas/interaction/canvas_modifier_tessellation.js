import {
  BasicMaterial,
  LambertMaterial,
  Mesh,
  PlaneGeometry,
} from "@/index.js";
import { createScene, runLoop } from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_modifier_tessellation",
  name: "Tessellation Modifier",
  category: "canvas",
  description:
    "A bounded PlaneGeometry grid exposes authored tessellation and a wireframe inspection pass instead of a GPU tessellation shader.",
};

/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "slider",
    key: "segments",
    label: "Segments",
    min: 2,
    max: 18,
    step: 2,
    default: 10,
  },
];

export function setup(canvas, params = {}) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [4.6, 4.2, 6.5],
    target: [0, 0, 0],
  });
  let segments = Math.max(2, Math.min(18, Number(params.segments ?? 10)));
  let geometry = new PlaneGeometry(6, 6, segments, segments);
  const surface = new Mesh(geometry, new LambertMaterial({ color: 0x4f9dba }));
  surface.rotation.x = -Math.PI / 2;
  const wire = new Mesh(
    geometry,
    new BasicMaterial({ color: 0xe7cf70, wireframe: true }),
  );
  wire.rotation.x = surface.rotation.x;
  wire.position.y = 0.012;
  scene.add(surface, wire);

  const instance = runLoop(renderer, scene, camera, (time) => {
    surface.position.y = Math.sin(time * 0.8) * 0.08;
    wire.position.y = surface.position.y + 0.012;
  });
  return {
    ...instance,
    update(nextParams = {}) {
      const nextSegments = Math.max(
        2,
        Math.min(18, Number(nextParams.segments ?? segments)),
      );
      if (nextSegments === segments) return;
      segments = nextSegments;
      geometry = new PlaneGeometry(6, 6, segments, segments);
      surface.geometry = geometry;
      wire.geometry = geometry;
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.PlaneGeometry(6, 6, segments, segments);
const surface = new EASEL.Mesh(geometry, lambertMaterial);
const wire = new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ wireframe: true }));`;

export const threeSource = `import * as THREE from "three";

const geometry = new THREE.PlaneGeometry(6, 6, segments, segments);
const surface = new THREE.Mesh(geometry, lambertMaterial);
const wire = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ wireframe: true }));`;

export const example = { meta, controls, setup, easelSource, threeSource };
