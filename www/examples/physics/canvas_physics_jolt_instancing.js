import { setup as setupRapierInstancing } from "./canvas_physics_rapier_instancing.js";

export const meta = {
  id: "physics_jolt_instancing",
  name: "Jolt instancing",
  category: "physics",
  description:
    "A deterministic CPU rigid-body boundary mirrors Jolt instanced transforms without its WebGPU renderer path.",
};

export const controls = [];

export function setup(canvas) {
  return setupRapierInstancing(canvas);
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const physics = new EASEL.PhysicsWorld({ gravity: new EASEL.Vector3(0, -9.81, 0) });
const instances = new EASEL.InstancedMesh(geometry, material, count);
physics.addBody(new EASEL.RigidBody({ shape: new EASEL.SphereShape(0.05), position }));
physics.update(deltaSeconds);
instances.setMatrixAt(index, matrix);`;

export const threeSource = `import * as THREE from "three";
import { JoltPhysics } from "three/addons/physics/JoltPhysics.js";
const physics = await JoltPhysics();
const instances = new THREE.InstancedMesh(geometry, material, count);
physics.addMesh(instances, 1);
physics.world.Step(1 / 60, 1, 1, 1);
physics.setMeshPosition(instances, position, index);`;

export const example = { meta, controls, setup, easelSource, threeSource };
