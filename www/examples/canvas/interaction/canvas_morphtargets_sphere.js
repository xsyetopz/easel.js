import { Attribute, LambertMaterial, Mesh, SphereGeometry } from "@/index.js";
import {
  applyMorphPositions,
  createScene,
  positionArray,
  runLoop,
} from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_morphtargets_sphere",
  name: "Morph Target Sphere",
  category: "canvas",
  description:
    "An authored sphere blends between a round and flattened target using CPU Geometry attributes and visible baked lighting.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [3.4, 2.4, 6.2],
    target: [0, 0, 0],
  });
  const geometry = new SphereGeometry(1.45, 24, 16);
  const base = positionArray(geometry);
  const flat = new Float32Array(base.length);
  const tall = new Float32Array(base.length);
  for (let index = 0; index < base.length; index += 3) {
    flat[index] = base[index] * 1.35;
    flat[index + 1] = base[index + 1] * 0.58;
    flat[index + 2] = base[index + 2] * 1.35;
    tall[index] = base[index] * 0.76;
    tall[index + 1] = base[index + 1] * 1.45;
    tall[index + 2] = base[index + 2] * 0.76;
  }
  const flatAttribute = new Attribute(flat, 3);
  flatAttribute.name = "flat";
  const tallAttribute = new Attribute(tall, 3);
  tallAttribute.name = "tall";
  geometry.morphAttributes = { position: [flatAttribute, tallAttribute] };
  geometry.morphTargetsRelative = false;
  const sphere = new Mesh(geometry, new LambertMaterial({ color: 0x8a7de0 }));
  scene.add(sphere);

  return runLoop(renderer, scene, camera, (time) => {
    const flatWeight = (Math.sin(time * 1.15) + 1) * 0.5;
    const tallWeight = (Math.cos(time * 1.15) + 1) * 0.5;
    sphere.morphTargetInfluences[0] = flatWeight;
    sphere.morphTargetInfluences[1] = tallWeight;
    applyMorphPositions(geometry, base, [flat, tall], [flatWeight, tallWeight]);
    sphere.rotation.y = time * 0.4;
  });
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

geometry.morphAttributes = { position: [flatTarget, tallTarget] };
sphere.morphTargetInfluences[1] = tallWeight;
applyMorphPositions(geometry, base, targets, sphere.morphTargetInfluences);`;

export const threeSource = `import * as THREE from "three";

geometry.morphAttributes = { position: [flatTarget, tallTarget] };
sphere.morphTargetInfluences[1] = tallWeight;
applyMorphPositions(geometry, base, targets, sphere.morphTargetInfluences);`;

export const example = { meta, controls, setup, easelSource, threeSource };
