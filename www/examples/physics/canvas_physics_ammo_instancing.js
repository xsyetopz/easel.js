import { setup as setupRapierInstancing } from "./canvas_physics_rapier_instancing.js";

export const meta = {
  id: "physics_ammo_instancing",
  name: "Ammo instancing",
  category: "physics",
  description:
    "A CPU rigid-body boundary synchronizes colored box and sphere instances without Ammo WASM or GPU buffers.",
};

export const controls = [];

export function setup(canvas) {
  return setupRapierInstancing(canvas);
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const physics = new EASEL.PhysicsWorld({ gravity: new EASEL.Vector3(0, -9.81, 0) });
const boxes = new EASEL.InstancedMesh(boxGeometry, material, count);
physics.addBody(new EASEL.RigidBody({ shape: new EASEL.AABBShape(halfExtents), position }));
physics.update(deltaSeconds);
boxes.setMatrixAt(index, matrix);`;

export const threeSource = `import * as THREE from "three";
import { AmmoPhysics } from "three/addons/physics/AmmoPhysics.js";
const physics = await AmmoPhysics();
const boxes = new THREE.InstancedMesh(boxGeometry, material, count);
physics.addMesh(boxes, 1);
physics.world.step(1 / 60);
physics.setMeshPosition(boxes, position, index);`;

export const example = { meta, controls, setup, easelSource, threeSource };
