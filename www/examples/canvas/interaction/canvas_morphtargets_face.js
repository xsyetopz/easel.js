import {
  Attribute,
  BasicMaterial,
  LambertMaterial,
  Mesh,
  SphereGeometry,
} from "@/index.js";
import {
  applyMorphPositions,
  createScene,
  positionArray,
  runLoop,
} from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_morphtargets_face",
  name: "Morph Target Face",
  category: "canvas",
  description:
    "An authored low-poly face uses a smile morph target and independently modeled eyes; external facial assets are intentionally not required.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [0, 0.3, 6.6],
    target: [0, 0.3, 0],
  });
  const geometry = new SphereGeometry(1.55, 20, 12);
  const base = positionArray(geometry);
  const smile = new Float32Array(base);
  for (let index = 0; index < smile.length; index += 3) {
    const x = base[index];
    const y = base[index + 1];
    const z = base[index + 2];
    const mouthRegion = z > 0.65 && y < -0.05;
    smile[index] = x;
    smile[index + 1] = y + (mouthRegion ? Math.abs(x) * 0.13 : 0);
    smile[index + 2] = z + (mouthRegion ? 0.06 : 0);
  }
  const smileAttribute = new Attribute(smile, 3);
  smileAttribute.name = "smile";
  geometry.morphAttributes = { position: [smileAttribute] };
  geometry.morphTargetsRelative = false;
  const face = new Mesh(geometry, new LambertMaterial({ color: 0xf1a77d }));
  scene.add(face);
  const eyeMaterial = new BasicMaterial({ color: 0x1b2230 });
  for (const x of [-0.55, 0.55]) {
    const eye = new Mesh(new SphereGeometry(0.18, 8, 5), eyeMaterial);
    eye.position.set(x, 0.42, 1.42);
    scene.add(eye);
  }

  return runLoop(renderer, scene, camera, (time) => {
    const weight = (Math.sin(time * 1.7) + 1) * 0.5;
    face.morphTargetInfluences[0] = weight;
    applyMorphPositions(geometry, base, [smile], [weight]);
    face.rotation.y = Math.sin(time * 0.32) * 0.25;
  });
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

geometry.morphAttributes = { position: [smileTarget] };
face.morphTargetInfluences[0] = smileWeight;
applyMorphPositions(geometry, base, [smileTarget], face.morphTargetInfluences);`;

export const threeSource = `import * as THREE from "three";

geometry.morphAttributes = { position: [smileTarget] };
face.morphTargetInfluences[0] = smileWeight;
applyMorphPositions(geometry, base, [smileTarget], face.morphTargetInfluences);`;

export const example = { meta, controls, setup, easelSource, threeSource };
