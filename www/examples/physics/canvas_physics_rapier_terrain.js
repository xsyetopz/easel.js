import {
  AABBShape,
  AmbientLight,
  DirectionalLight,
  Geometry,
  HeightfieldShape,
  LambertMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  PhysicsWorld,
  Renderer,
  RigidBody,
  Scene,
  SphereGeometry,
  SphereShape,
  Vector3,
  BoxGeometry,
} from "@/index.js";

export const meta = {
  id: "physics_rapier_terrain",
  name: "Rapier terrain heightfield",
  category: "physics",
  description:
    "A deterministic CPU heightfield replaces Rapier's terrain collider while preserving falling rigid bodies and Canvas2D controls.",
};

export const controls = [];

const TERRAIN_WIDTH = 33;
const TERRAIN_DEPTH = 33;
const TERRAIN_SIZE = 20;
const TERRAIN_MIN_HEIGHT = -1.5;
const TERRAIN_MAX_HEIGHT = 4;

function generateHeight(width, depth) {
  const data = new Float32Array(width * depth);
  const range = TERRAIN_MAX_HEIGHT - TERRAIN_MIN_HEIGHT;
  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      const nx = (x - (width - 1) / 2) / ((width - 1) / 2);
      const nz = (z - (depth - 1) / 2) / ((depth - 1) / 2);
      const radius = Math.hypot(nx, nz);
      data[z * width + x] =
        (Math.sin(radius * 12) + 1) * 0.5 * range + TERRAIN_MIN_HEIGHT;
    }
  }
  return data;
}

function createTerrainGeometry(width, depth, size, heights) {
  const positions = new Float32Array(width * depth * 3);
  const uvs = new Float32Array(width * depth * 2);
  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      const vertex = z * width + x;
      positions[vertex * 3] = (x / (width - 1) - 0.5) * size;
      positions[vertex * 3 + 1] = heights[vertex];
      positions[vertex * 3 + 2] = (z / (depth - 1) - 0.5) * size;
      uvs[vertex * 2] = x / (width - 1);
      uvs[vertex * 2 + 1] = z / (depth - 1);
    }
  }
  const indices = [];
  for (let z = 0; z < depth - 1; z++) {
    for (let x = 0; x < width - 1; x++) {
      const a = z * width + x;
      const b = (z + 1) * width + x;
      const c = (z + 1) * width + x + 1;
      const d = z * width + x + 1;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new Geometry();
  geometry.setPositions(positions).setUVs(uvs);
  geometry.index = indices;
  geometry.computeVertexNormals();
  return geometry;
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0xbfd1e5;
  const camera = new PerspectiveCamera({
    fov: 60,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 8, 18);
  camera.lookAt(new Vector3(0, 1, 0));
  const renderer = new Renderer({ canvas, width, height });
  const controlsInstance = new OrbitControls(camera, canvas);
  controlsInstance.target.set(0, 1, 0);
  controlsInstance.enableZoom = false;
  controlsInstance.update();
  scene.add(new AmbientLight(0xffffff, 0.45));
  const light = new DirectionalLight(0xffffff, 2.2);
  light.position.set(8, 14, 10);
  scene.add(light);

  const heights = generateHeight(TERRAIN_WIDTH, TERRAIN_DEPTH);
  const terrainShape = new HeightfieldShape({
    width: TERRAIN_WIDTH,
    depth: TERRAIN_DEPTH,
    sizeX: TERRAIN_SIZE,
    sizeZ: TERRAIN_SIZE,
    heights,
  });
  const terrain = new Mesh(
    createTerrainGeometry(TERRAIN_WIDTH, TERRAIN_DEPTH, TERRAIN_SIZE, heights),
    new LambertMaterial({ color: 0xc7c7c7 }),
  );
  scene.add(terrain);

  const physics = new PhysicsWorld({
    gravity: new Vector3(0, -9.81, 0),
    fixedTimeStep: 1 / 60,
    maxSubSteps: 6,
  });
  physics.addBody(new RigidBody({ shape: terrainShape, mass: 0 }));
  const random = createRandom(0x4217a5c3);
  const dynamicObjects = [];
  for (let index = 0; index < 12; index++) {
    const sphere = index % 3 === 0;
    const size = 0.65 + random() * 0.6;
    const node = new Mesh(
      sphere
        ? new SphereGeometry(size * 0.5, 12, 8)
        : new BoxGeometry(size, size, size),
      new LambertMaterial({ color: sphere ? 0xe28a3b : 0x4a78b5 }),
    );
    const x = (random() - 0.5) * TERRAIN_SIZE * 0.7;
    const z = (random() - 0.5) * TERRAIN_SIZE * 0.7;
    const y = TERRAIN_MAX_HEIGHT + 5 + index * 0.7;
    node.position.set(x, y, z);
    scene.add(node);
    const body = new RigidBody({
      node,
      shape: sphere
        ? new SphereShape(size * 0.5)
        : new AABBShape(new Vector3(size * 0.5, size * 0.5, size * 0.5)),
      mass: 1,
      restitution: 0.25,
      friction: 0.35,
    });
    physics.addBody(body);
    dynamicObjects.push(body);
  }

  let previousTimestamp;
  let animationFrame;
  const requestFrame =
    typeof globalThis.requestAnimationFrame === "function"
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : () => 0;
  const cancelFrame =
    typeof globalThis.cancelAnimationFrame === "function"
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : () => undefined;
  function animate(timestamp) {
    animationFrame = requestFrame(animate);
    const delta =
      previousTimestamp === undefined
        ? 0
        : Math.min(0.1, Math.max(0, (timestamp - previousTimestamp) / 1000));
    previousTimestamp = timestamp;
    physics.update(delta);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate(0);
  return {
    update(params = {}) {
      if (params.reset === 1 || params.reset === "1") {
        for (const [index, body] of dynamicObjects.entries()) {
          body.position.set(0, TERRAIN_MAX_HEIGHT + 5 + index * 0.7, 0);
          body.velocity.set(0, 0, 0);
          body.syncToNode();
        }
      }
    },
    cleanup() {
      if (animationFrame !== undefined) cancelFrame(animationFrame);
      controlsInstance.dispose();
      physics.dispose();
      scene.clear();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const terrain = new EASEL.HeightfieldShape({ width, depth, heights, sizeX: 100, sizeZ: 100 });
physics.addBody(new EASEL.RigidBody({ shape: terrain, mass: 0 }));
physics.update(deltaSeconds);`;

export const threeSource = `import * as THREE from "three";
import { RapierPhysics } from "three/addons/physics/RapierPhysics.js";
const physics = await RapierPhysics();
physics.addHeightfield(terrainMesh, terrainWidth - 1, terrainDepth - 1, heightData, { x: terrainWidthExtents, y: 1, z: terrainDepthExtents });
physics.world.step();`;

export const example = { meta, controls, setup, easelSource, threeSource };
