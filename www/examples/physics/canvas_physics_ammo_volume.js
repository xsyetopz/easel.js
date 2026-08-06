import {
  AmbientLight,
  BasicMaterial,
  BoxGeometry,
  Geometry,
  LambertMaterial,
  Mesh,
  OrbitControls,
  ParticleWorld,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "physics_ammo_volume",
  name: "Ammo soft volume",
  category: "physics",
  description:
    "Low-poly CPU soft volumes preserve surface topology with particle constraints and Canvas2D shading without Ammo WASM.",
};

export const controls = [];

function createOctahedron(center, radius) {
  const positions = [
    center.x + radius,
    center.y,
    center.z,
    center.x - radius,
    center.y,
    center.z,
    center.x,
    center.y + radius,
    center.z,
    center.x,
    center.y - radius,
    center.z,
    center.x,
    center.y,
    center.z + radius,
    center.x,
    center.y,
    center.z - radius,
  ];
  const indices = [
    0, 2, 4, 0, 5, 2, 0, 3, 5, 0, 4, 3, 1, 4, 2, 1, 2, 5, 1, 5, 3, 1, 3, 4,
  ];
  return { positions, indices };
}

function createCube(center, size) {
  const half = size / 2;
  const positions = [];
  for (const y of [-half, half]) {
    for (const z of [-half, half]) {
      for (const x of [-half, half]) {
        positions.push(center.x + x, center.y + y, center.z + z);
      }
    }
  }
  const indices = [
    0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0,
    2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3,
  ];
  return { positions, indices };
}

function createSurface(data) {
  const geometry = new Geometry().setPositions(data.positions);
  geometry.index = data.indices;
  geometry.computeVertexNormals();
  return geometry;
}

function addSoftVolume(world, data, stiffness) {
  const particles = [];
  const initialPositions = [];
  for (let offset = 0; offset < data.positions.length; offset += 3) {
    const position = new Vector3(
      data.positions[offset],
      data.positions[offset + 1],
      data.positions[offset + 2],
    );
    particles.push(world.addParticle({ position, mass: 1 }));
    initialPositions.push(position.clone());
  }
  const edges = new Set();
  for (let offset = 0; offset < data.indices.length; offset += 3) {
    const triangle = [
      data.indices[offset],
      data.indices[offset + 1],
      data.indices[offset + 2],
    ];
    for (let index = 0; index < 3; index++) {
      const a = triangle[index];
      const b = triangle[(index + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (edges.has(key)) continue;
      edges.add(key);
      world.addDistanceConstraint(particles[a], particles[b], { stiffness });
    }
  }
  return { particles, initialPositions };
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0xbfd1e5;
  const camera = new PerspectiveCamera({
    fov: 55,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(8, 5, 12);
  camera.lookAt(new Vector3(0, 1.5, 0));
  const renderer = new Renderer({ canvas, width, height });
  const controlsInstance = new OrbitControls(camera, canvas);
  controlsInstance.target.set(0, 1.5, 0);
  controlsInstance.update();
  scene.add(new AmbientLight(0xffffff, 0.65));
  const floor = new Mesh(
    new BoxGeometry(14, 0.4, 14),
    new LambertMaterial({ color: 0xe7ecef }),
  );
  floor.position.y = -1.8;
  scene.add(floor);
  const world = new ParticleWorld({
    gravity: new Vector3(0, -9.81, 0),
    fixedTimeStep: 1 / 60,
    maxSubSteps: 8,
    iterations: 6,
    groundY: -1.6,
    damping: 0.997,
    groundRestitution: 0.08,
    groundFriction: 0.92,
  });
  const octahedron = createOctahedron(new Vector3(-2, 3.4, 0), 1.2);
  const cube = createCube(new Vector3(2, 4.2, 0), 2.2);
  const octaGeometry = createSurface(octahedron);
  const cubeGeometry = createSurface(cube);
  const octahedronMesh = new Mesh(
    octaGeometry,
    new BasicMaterial({ color: 0xf0a34a, side: Side.Double }),
  );
  const cubeMesh = new Mesh(
    cubeGeometry,
    new BasicMaterial({ color: 0x4e86c6, side: Side.Double }),
  );
  scene.add(octahedronMesh, cubeMesh);
  const octaState = addSoftVolume(world, octahedron, 0.8);
  const cubeState = addSoftVolume(world, cube, 0.78);
  const updateSurface = (geometry, state) => {
    const positions = geometry.getAttribute("position");
    if (!positions) return;
    for (let index = 0; index < state.particles.length; index++) {
      const particle = state.particles[index];
      positions.setXYZ(
        index,
        particle.position.x,
        particle.position.y,
        particle.position.z,
      );
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  };
  const reset = () => {
    for (const state of [octaState, cubeState]) {
      for (let index = 0; index < state.particles.length; index++) {
        state.particles[index].position.copy(state.initialPositions[index]);
        state.particles[index].velocity.set(0, 0, 0);
      }
    }
  };
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
    if (delta > 0) world.update(delta);
    updateSurface(octaGeometry, octaState);
    updateSurface(cubeGeometry, cubeState);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate(0);
  return {
    update(params = {}) {
      if (params.reset === 1 || params.reset === "1") reset();
    },
    cleanup() {
      if (animationFrame !== undefined) cancelFrame(animationFrame);
      controlsInstance.dispose();
      world.dispose();
      scene.clear();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const volume = new EASEL.ParticleWorld({ gravity: new EASEL.Vector3(0, -9.81, 0) });
const particle = volume.addParticle({ position, mass: 1 });
volume.addDistanceConstraint(previousParticle, particle, { stiffness: 0.8 });
volume.update(deltaSeconds);
volumeGeometry.getAttribute("position").needsUpdate = true;`;

export const threeSource = `import * as THREE from "three";
import Ammo from "ammojs-typed";
const physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
const volumeSoftBody = softBodyHelpers.CreateFromTriMesh(physicsWorld.getWorldInfo(), vertices, indices, triangleCount, true);
physicsWorld.addSoftBody(volumeSoftBody, 1, -1);
physicsWorld.stepSimulation(deltaSeconds, 10);`;

export const example = { meta, controls, setup, easelSource, threeSource };
