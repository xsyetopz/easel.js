import {
  AABBShape,
  BoxGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  LambertMaterial,
  Matrix4,
  OrbitControls,
  PerspectiveCamera,
  PhysicsWorld,
  Quaternion,
  Renderer,
  RigidBody,
  Scene,
  SphereShape,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "physics_rapier_instancing",
  name: "Rapier instancing",
  category: "physics",
  description:
    "A deterministic CPU physics world synchronizes colored box and sphere InstancedMesh bodies on a Canvas2D floor.",
};

export const controls = [];

const INSTANCE_COUNT = 96;
const BOX_SIZE = 0.075;
const SPHERE_RADIUS = 0.05;

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createInstanceSet({ geometry, material, shape, random, count }) {
  const mesh = new InstancedMesh(geometry, material, count);
  const bodies = [];
  const angles = new Float32Array(count);
  const spins = new Float32Array(count);
  const colors = new Color();
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const yAxis = new Vector3(0, 1, 0);
  const scale = new Vector3(1, 1, 1);
  for (let index = 0; index < count; index++) {
    const position = new Vector3(random() - 0.5, random() * 2, random() - 0.5);
    const body = new RigidBody({
      position,
      shape: shape.clone(),
      mass: 1,
      restitution: 0.25,
      friction: 0.45,
    });
    bodies.push(body);
    angles[index] = random() * Math.PI * 2;
    spins[index] = (random() - 0.5) * 4;
    mesh.setColorAt(index, colors.set((random() * 0xffffff) | 0));
    matrix.compose(
      position,
      quaternion.setFromAxisAngle(yAxis, angles[index]),
      scale,
    );
    mesh.setMatrixAt(index, matrix);
  }
  return { mesh, bodies, angles, spins };
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x666666;
  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(-1, 1.5, 2);
  camera.lookAt(new Vector3(0, 0.5, 0));
  const renderer = new Renderer({ canvas, width, height });
  const orbitControls = new OrbitControls(camera, canvas);
  orbitControls.target.set(0, 0.5, 0);
  orbitControls.update();

  scene.add(new HemisphereLight(0xffffff, 0x444444, 1.2));
  const directional = new DirectionalLight(0xffffff, 1.6);
  directional.position.set(5, 5, 5);
  scene.add(directional);

  const floor = new RigidBody({
    position: new Vector3(0, -2.5, 0),
    shape: new AABBShape(new Vector3(5, 2.5, 5)),
    mass: 0,
  });
  const floorMesh = new InstancedMesh(
    new BoxGeometry(10, 0.05, 10),
    new LambertMaterial({ color: 0x444444 }),
    1,
  );
  floorMesh.setMatrixAt(0, new Matrix4().setPosition(0, -0.025, 0));
  scene.add(floorMesh);

  const material = new LambertMaterial({ color: 0xffffff });
  const random = createRandom(0x3e0f1a2b);
  const boxes = createInstanceSet({
    geometry: new BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE),
    material,
    shape: new AABBShape(new Vector3(BOX_SIZE / 2, BOX_SIZE / 2, BOX_SIZE / 2)),
    random,
    count: INSTANCE_COUNT,
  });
  const spheres = createInstanceSet({
    geometry: new IcosahedronGeometry(SPHERE_RADIUS, 1),
    material,
    shape: new SphereShape(SPHERE_RADIUS),
    random,
    count: INSTANCE_COUNT,
  });
  scene.add(boxes.mesh, spheres.mesh);

  const physics = new PhysicsWorld({
    gravity: new Vector3(0, -9.81, 0),
    fixedTimeStep: 1 / 60,
    maxSubSteps: 4,
  });
  physics.addBody(floor);
  for (const body of boxes.bodies) physics.addBody(body);
  for (const body of spheres.bodies) physics.addBody(body);

  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const scale = new Vector3(1, 1, 1);
  const yAxis = new Vector3(0, 1, 0);
  function syncSet(set, delta) {
    for (let index = 0; index < set.bodies.length; index++) {
      set.angles[index] += set.spins[index] * delta;
      matrix.compose(
        set.bodies[index].position,
        quaternion.setFromAxisAngle(yAxis, set.angles[index]),
        scale,
      );
      set.mesh.setMatrixAt(index, matrix);
    }
  }

  const impulse = new Vector3();
  function shake() {
    for (let index = 0; index < boxes.bodies.length; index++) {
      impulse.set(
        Math.sin(index * 1.7) * 2.5,
        2 + (index % 5) * 0.35,
        Math.cos(index * 1.3) * 2.5,
      );
      boxes.bodies[index].applyImpulse(impulse);
    }
    for (let index = 0; index < spheres.bodies.length; index++) {
      impulse.set(
        Math.sin(index * 1.1 + 0.5) * 2.5,
        2 + (index % 7) * 0.3,
        Math.cos(index * 1.9 + 0.5) * 2.5,
      );
      spheres.bodies[index].applyImpulse(impulse);
    }
  }

  const onShake = () => shake();
  canvas.addEventListener("pointerdown", onShake);
  let previousTimestamp;
  let animationFrame;
  let respawnAccumulator = 0;
  function respawn() {
    const box = boxes.bodies[Math.floor(random() * boxes.bodies.length)];
    const sphere = spheres.bodies[Math.floor(random() * spheres.bodies.length)];
    box?.position.set(0, random() + 1, 0);
    sphere?.position.set(0, random() + 1, 0);
  }
  function animate(timestamp) {
    animationFrame = globalThis.requestAnimationFrame(animate);
    const delta =
      previousTimestamp === undefined
        ? 0
        : Math.min(0.1, Math.max(0, (timestamp - previousTimestamp) / 1000));
    previousTimestamp = timestamp;
    physics.update(delta);
    respawnAccumulator += delta;
    while (respawnAccumulator >= 1 / 60) {
      respawnAccumulator -= 1 / 60;
      respawn();
    }
    syncSet(boxes, delta);
    syncSet(spheres, delta);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate(0);
  return {
    update(params = {}) {
      if (params.shake === 1 || params.shake === "1") shake();
    },
    shake,
    cleanup() {
      if (animationFrame !== undefined)
        globalThis.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointerdown", onShake);
      orbitControls.dispose();
      physics.dispose();
      scene.clear();
      renderer.dispose();
      boxes.bodies.length = 0;
      spheres.bodies.length = 0;
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const physics = new EASEL.PhysicsWorld({ gravity: new EASEL.Vector3(0, -9.81, 0) });
const spheres = new EASEL.InstancedMesh(geometrySphere, material, count);
physics.addBody(new EASEL.RigidBody({ shape: new EASEL.SphereShape(0.05), position }));
physics.update(deltaSeconds);
spheres.setMatrixAt(index, matrix);
physicsBody.applyImpulse(impulse);`;

export const threeSource = `import * as THREE from "three";
import { RapierPhysics } from "three/addons/physics/RapierPhysics.js";

const physics = await RapierPhysics();
physics.addScene(scene);
const spheres = new THREE.InstancedMesh(geometrySphere, material, count);
physics.applyImpulse(spheres, impulse, index);
physics.world.step();
physics.setMeshPosition(spheres, position, index);`;

export const example = { meta, controls, setup, easelSource, threeSource };
