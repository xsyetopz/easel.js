import {
  AABBShape,
  AmbientLight,
  BoxGeometry,
  LambertMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  PhysicsWorld,
  Renderer,
  RigidBody,
  Scene,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "physics_ammo_break",
  name: "Ammo convex break",
  category: "physics",
  description:
    "A CPU breakable tower replaces Ammo convex-fracture state with deterministic rigid debris and Canvas2D collision response.",
};

export const controls = [];

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
  camera.lookAt(new Vector3(0, 2, 0));
  const renderer = new Renderer({ canvas, width, height });
  const controlsInstance = new OrbitControls(camera, canvas);
  controlsInstance.target.set(0, 2, 0);
  controlsInstance.update();
  scene.add(new AmbientLight(0xffffff, 0.65));
  const floor = new Mesh(
    new BoxGeometry(14, 0.4, 14),
    new LambertMaterial({ color: 0xe7ecef }),
  );
  floor.position.y = -1.8;
  scene.add(floor);
  const world = new PhysicsWorld({
    gravity: new Vector3(0, -9.81, 0),
    fixedTimeStep: 1 / 60,
    maxSubSteps: 8,
  });
  const floorBody = new RigidBody({
    node: floor,
    shape: new AABBShape(new Vector3(7, 0.2, 7)),
    mass: 0,
  });
  world.addBody(floorBody);
  const stack = [];
  const debris = [];
  const towerPositions = [];
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 3; column++) {
      towerPositions.push(
        new Vector3((column - 1) * 1.05, -1.35 + row * 1.05, 0),
      );
    }
  }
  const createBody = (position, size, color, mass = 1) => {
    const node = new Mesh(
      new BoxGeometry(size.x, size.y, size.z),
      new LambertMaterial({ color }),
    );
    node.position.copy(position);
    scene.add(node);
    const body = new RigidBody({
      node,
      shape: new AABBShape(size.clone().multiplyScalar(0.5)),
      mass,
      restitution: 0.25,
      friction: 0.6,
    });
    world.addBody(body);
    return { node, body };
  };
  const buildStack = () => {
    for (const position of towerPositions) {
      stack.push(createBody(position, new Vector3(0.95, 0.95, 0.95), 0xb03814));
    }
  };
  buildStack();
  let broken = false;
  const breakObjects = () => {
    if (broken) return;
    broken = true;
    for (const object of stack) {
      world.removeBody(object.body);
      scene.remove(object.node);
      const center = object.body.position.clone();
      for (let shardIndex = 0; shardIndex < 4; shardIndex++) {
        const x = shardIndex % 2 === 0 ? -0.22 : 0.22;
        const z = shardIndex < 2 ? -0.22 : 0.22;
        const shard = createBody(
          center.clone().add(new Vector3(x, 0, z)),
          new Vector3(0.43, 0.82, 0.43),
          0xd66d2a,
        );
        shard.body.applyImpulse(new Vector3(x * 5, 2 + Math.abs(x) * 2, z * 5));
        debris.push(shard);
      }
    }
    stack.length = 0;
  };
  const reset = () => {
    for (const object of [...stack, ...debris]) {
      world.removeBody(object.body);
      scene.remove(object.node);
    }
    stack.length = 0;
    debris.length = 0;
    broken = false;
    buildStack();
  };
  const onPointerDown = () => breakObjects();
  canvas.addEventListener?.("pointerdown", onPointerDown);

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
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate(0);
  return {
    update(params = {}) {
      if (params.break === 1 || params.break === "1") breakObjects();
      if (params.reset === 1 || params.reset === "1") reset();
    },
    cleanup() {
      if (animationFrame !== undefined) cancelFrame(animationFrame);
      canvas.removeEventListener?.("pointerdown", onPointerDown);
      controlsInstance.dispose();
      world.dispose();
      stack.length = 0;
      debris.length = 0;
      scene.clear();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const world = new EASEL.PhysicsWorld({ gravity: new EASEL.Vector3(0, -9.81, 0) });
world.addBody(new EASEL.RigidBody({ shape: new EASEL.AABBShape(halfExtents), position }));
const shard = new EASEL.RigidBody({ shape: new EASEL.AABBShape(shardExtents), position: fragmentPosition });
shard.applyImpulse(impulse);
world.update(deltaSeconds);`;

export const threeSource = `import * as THREE from "three";
import Ammo from "ammojs-typed";
import { ConvexObjectBreaker } from "three/addons/misc/ConvexObjectBreaker.js";
const convexBreaker = new ConvexObjectBreaker();
const breakable = convexBreaker.prepareBreakableObject(mesh, mass, velocity, angularVelocity, margin);
physicsWorld.stepSimulation(deltaSeconds, 10);`;

export const example = { meta, controls, setup, easelSource, threeSource };
