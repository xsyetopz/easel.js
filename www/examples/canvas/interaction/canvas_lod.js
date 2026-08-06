import {
  BoxGeometry,
  LambertMaterial,
  LOD,
  Mesh,
  OrbitControls,
  SphereGeometry,
} from "@/index.js";
import { createScene, runLoop } from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_lod",
  name: "Level of Detail",
  category: "canvas",
  description:
    "Distance thresholds switch authored CPU meshes through LOD.update; no GPU-driven geometry replacement is required.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [3, 2.5, 11],
    target: [0, 0, 0],
  });
  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(0, 0, 0);
  orbit.enableDamping = true;
  const lod = new LOD();
  lod.position.y = 0.4;
  const high = new Mesh(
    new SphereGeometry(1.35, 24, 14),
    new LambertMaterial({ color: 0x63b8e7 }),
  );
  const medium = new Mesh(
    new SphereGeometry(1.35, 12, 7),
    new LambertMaterial({ color: 0x63b8e7 }),
  );
  const low = new Mesh(
    new BoxGeometry(2.2, 2.2, 2.2),
    new LambertMaterial({ color: 0x63b8e7 }),
  );
  lod.addLevel(high, 0, 0.08);
  lod.addLevel(medium, 4, 0.08);
  lod.addLevel(low, 8, 0.08);
  scene.add(lod);

  return runLoop(
    renderer,
    scene,
    camera,
    (time) => {
      orbit.update();
      lod.rotation.y = time * 0.35;
      lod.update(camera);
    },
    [() => orbit.dispose()],
  );
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const lod = new EASEL.LOD();
lod.addLevel(highMesh, 0, 0.08);
lod.addLevel(lowMesh, 8, 0.08);
lod.update(camera);`;

export const threeSource = `import * as THREE from "three";

const lod = new THREE.LOD();
lod.addLevel(highMesh, 0, 0.08);
lod.addLevel(lowMesh, 8, 0.08);
lod.update(camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
