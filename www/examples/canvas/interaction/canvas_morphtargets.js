import { Attribute, BoxGeometry, LambertMaterial, Mesh } from "@/index.js";
import {
  applyMorphPositions,
  createScene,
  positionArray,
  runLoop,
} from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_morphtargets",
  name: "Morph Targets",
  category: "canvas",
  description:
    "Two authored absolute morph targets squash and stretch a CPU mesh; Geometry position edits provide visible Canvas2D output.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [3.8, 2.7, 6.5],
    target: [0, 0, 0],
  });
  const geometry = new BoxGeometry(2, 2, 2, 3, 3, 3);
  const base = positionArray(geometry);
  const squash = new Float32Array(base.length);
  const stretch = new Float32Array(base.length);
  for (let index = 0; index < base.length; index += 3) {
    squash[index] = base[index] * 1.15;
    squash[index + 1] = base[index + 1] * 0.48;
    squash[index + 2] = base[index + 2] * 1.15;
    stretch[index] = base[index] * 0.72;
    stretch[index + 1] = base[index + 1] * 1.65;
    stretch[index + 2] = base[index + 2] * 0.72;
  }
  const squashAttribute = new Attribute(squash, 3);
  squashAttribute.name = "squash";
  const stretchAttribute = new Attribute(stretch, 3);
  stretchAttribute.name = "stretch";
  geometry.morphAttributes = { position: [squashAttribute, stretchAttribute] };
  geometry.morphTargetsRelative = false;
  const mesh = new Mesh(geometry, new LambertMaterial({ color: 0x62a9df }));
  scene.add(mesh);

  return runLoop(renderer, scene, camera, (time) => {
    const squashWeight = (Math.sin(time * 1.4) + 1) * 0.5;
    const stretchWeight = (Math.cos(time * 1.4) + 1) * 0.5;
    mesh.morphTargetInfluences[0] = squashWeight;
    mesh.morphTargetInfluences[1] = stretchWeight;
    applyMorphPositions(
      geometry,
      base,
      [squash, stretch],
      [squashWeight, stretchWeight],
    );
    mesh.rotation.y = time * 0.45;
  });
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

geometry.morphAttributes = { position: [squashTarget, stretchTarget] };
mesh.morphTargetInfluences[0] = squashWeight;
applyMorphPositions(geometry, base, targets, mesh.morphTargetInfluences);`;

export const threeSource = `import * as THREE from "three";

geometry.morphAttributes = { position: [squashTarget, stretchTarget] };
mesh.morphTargetInfluences[0] = squashWeight;
applyMorphPositions(geometry, base, targets, mesh.morphTargetInfluences);`;

export const example = { meta, controls, setup, easelSource, threeSource };
