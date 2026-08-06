import { setup as setupRapierTerrain } from "./canvas_physics_rapier_terrain.js";

export const meta = {
  id: "physics_ammo_terrain",
  name: "Ammo terrain heightfield",
  category: "physics",
  description:
    "The Ammo heightfield example uses the same deterministic CPU terrain collider and rigid-body boundary as the Rapier route.",
};

export const controls = [];

export function setup(canvas) {
  return setupRapierTerrain(canvas);
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const terrain = new EASEL.HeightfieldShape({ width, depth, heights, sizeX: 100, sizeZ: 100 });
physics.addBody(new EASEL.RigidBody({ shape: terrain, mass: 0 }));
physics.update(deltaSeconds);`;

export const threeSource = `import * as THREE from "three";
import Ammo from "ammojs-typed";
const heightFieldShape = new Ammo.btHeightfieldTerrainShape(terrainWidth, terrainDepth, ammoHeightData, 1, terrainMinHeight, terrainMaxHeight, 1, "PHY_FLOAT", false);
heightFieldShape.setLocalScaling(new Ammo.btVector3(terrainWidthExtents / (terrainWidth - 1), 1, terrainDepthExtents / (terrainDepth - 1)));
physicsWorld.addRigidBody(new Ammo.btRigidBody(heightFieldShape));
physicsWorld.stepSimulation(deltaSeconds, 10);`;

export const example = { meta, controls, setup, easelSource, threeSource };
