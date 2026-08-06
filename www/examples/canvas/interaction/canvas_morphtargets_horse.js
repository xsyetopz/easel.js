import {
  Attribute,
  BoxGeometry,
  CylinderGeometry,
  LambertMaterial,
  Mesh,
} from "@/index.js";
import {
  applyMorphPositions,
  createScene,
  positionArray,
  runLoop,
} from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_morphtargets_horse",
  name: "Morph Target Horse",
  category: "canvas",
  description:
    "A small authored horse silhouette demonstrates a galloping body morph without loading the original external morph asset.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [4.8, 2.8, 7.6],
    target: [0, 0.8, 0],
  });
  const bodyGeometry = new BoxGeometry(2.7, 1.25, 1.05, 2, 2, 2);
  const base = positionArray(bodyGeometry);
  const gallop = new Float32Array(base);
  for (let index = 0; index < gallop.length; index += 3) {
    gallop[index] = base[index] * 1.16;
    gallop[index + 1] = base[index + 1] * (base[index + 1] > 0 ? 0.86 : 1.08);
    gallop[index + 2] = base[index + 2] * 0.9;
  }
  const gallopAttribute = new Attribute(gallop, 3);
  gallopAttribute.name = "gallop";
  bodyGeometry.morphAttributes = { position: [gallopAttribute] };
  bodyGeometry.morphTargetsRelative = false;
  const brown = new LambertMaterial({ color: 0x9a6244 });
  const body = new Mesh(bodyGeometry, brown);
  body.position.y = 1.45;
  scene.add(body);
  const neck = new Mesh(new CylinderGeometry(0.34, 0.45, 1.6, 10), brown);
  neck.position.set(1.15, 2.25, 0);
  neck.rotation.z = -0.35;
  scene.add(neck);
  const head = new Mesh(new BoxGeometry(0.95, 0.7, 0.65), brown);
  head.position.set(1.62, 2.9, 0);
  head.rotation.z = -0.15;
  scene.add(head);
  const legs = [];
  for (const x of [-0.9, 0.85]) {
    for (const z of [-0.35, 0.35]) {
      const leg = new Mesh(new CylinderGeometry(0.14, 0.18, 1.55, 8), brown);
      leg.position.set(x, 0.45, z);
      scene.add(leg);
      legs.push(leg);
    }
  }

  return runLoop(renderer, scene, camera, (time) => {
    const weight = (Math.sin(time * 3.2) + 1) * 0.5;
    body.morphTargetInfluences[0] = weight;
    applyMorphPositions(bodyGeometry, base, [gallop], [weight]);
    body.rotation.y = Math.sin(time * 0.6) * 0.04;
    for (let index = 0; index < legs.length; index++) {
      legs[index].rotation.z = Math.sin(time * 3.2 + index * Math.PI) * 0.26;
    }
  });
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

bodyGeometry.morphAttributes = { position: [gallopTarget] };
body.morphTargetInfluences[0] = gallopWeight;
applyMorphPositions(bodyGeometry, base, [gallopTarget], body.morphTargetInfluences);`;

export const threeSource = `import * as THREE from "three";

bodyGeometry.morphAttributes = { position: [gallopTarget] };
body.morphTargetInfluences[0] = gallopWeight;
applyMorphPositions(bodyGeometry, base, [gallopTarget], body.morphTargetInfluences);`;

export const example = { meta, controls, setup, easelSource, threeSource };
