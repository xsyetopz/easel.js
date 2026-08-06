import {
  AmbientLight,
  BoxGeometry,
  Geometry,
  LambertMaterial,
  LineMaterial,
  LineSegments,
  Mesh,
  OrbitControls,
  ParticleWorld,
  PerspectiveCamera,
  Renderer,
  Scene,
  SphereGeometry,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "physics_ammo_rope",
  name: "Ammo rope",
  category: "physics",
  description:
    "A CPU rope follows the Ammo soft-body topology with particle distance constraints and Canvas2D line rasterization.",
};

export const controls = [];

function createRopeGeometry(segmentCount) {
  const positions = new Float32Array(segmentCount * 2 * 3);
  const geometry = new Geometry().setPositions(positions);
  geometry.computeBoundingSphere();
  return geometry;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const segmentCount = 10;
  const ropeLength = 4;
  const ropeTop = new Vector3(0, 4.8, 0);
  const segmentLength = ropeLength / segmentCount;
  const scene = new Scene();
  scene.background = 0xbfd1e5;
  const camera = new PerspectiveCamera({
    fov: 55,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(7, 4, 10);
  camera.lookAt(new Vector3(0, 2, 0));
  const renderer = new Renderer({ canvas, width, height });
  const controlsInstance = new OrbitControls(camera, canvas);
  controlsInstance.target.set(0, 2, 0);
  controlsInstance.update();
  scene.add(new AmbientLight(0xffffff, 0.65));
  const floor = new Mesh(
    new BoxGeometry(12, 0.4, 12),
    new LambertMaterial({ color: 0xe7ecef }),
  );
  floor.position.y = -1.8;
  scene.add(floor);
  const ball = new Mesh(
    new SphereGeometry(0.45, 16, 10),
    new LambertMaterial({ color: 0xd33434 }),
  );
  scene.add(ball);
  const arm = new Mesh(
    new BoxGeometry(5.2, 0.16, 0.16),
    new LambertMaterial({ color: 0x4e86c6 }),
  );
  arm.position.set(0, ropeTop.y + ropeLength, ropeTop.z);
  scene.add(arm);

  const world = new ParticleWorld({
    gravity: new Vector3(0, -9.81, 0),
    fixedTimeStep: 1 / 60,
    maxSubSteps: 8,
    iterations: 8,
    groundY: -1.6,
    damping: 0.998,
    groundRestitution: 0.1,
    groundFriction: 0.92,
  });
  const particles = [];
  const initialPositions = [];
  for (let index = 0; index <= segmentCount; index++) {
    const position = ropeTop
      .clone()
      .add(new Vector3(0, index * segmentLength, 0));
    const particle = world.addParticle({
      position,
      mass: index === segmentCount ? 0.5 : index === 0 ? 0 : 0.08,
    });
    particles.push(particle);
    initialPositions.push(position.clone());
    if (index > 0) {
      world.addDistanceConstraint(particles[index - 1], particle, {
        stiffness: 0.98,
      });
    }
  }
  const ropeGeometry = createRopeGeometry(segmentCount);
  const rope = new LineSegments(
    ropeGeometry,
    new LineMaterial({ color: 0x222222, linewidth: 2 }),
  );
  scene.add(rope);
  let armDirection = 0;
  let armOffset = 0;
  const setArm = (offset) => {
    armOffset = Math.max(-1.1, Math.min(1.1, offset));
    arm.position.x = armOffset;
    world.pin(
      particles[0],
      new Vector3(ropeTop.x + armOffset, ropeTop.y, ropeTop.z),
    );
  };
  const reset = () => {
    for (let index = 0; index < particles.length; index++) {
      particles[index].position.copy(initialPositions[index]);
      particles[index].velocity.set(0, 0, 0);
    }
    setArm(0);
  };
  setArm(0);
  const onKeyDown = (event) => {
    const key = String(event.key).toLowerCase();
    if (key === "q") armDirection = -1;
    if (key === "a") armDirection = 1;
  };
  const onKeyUp = (event) => {
    const key = String(event.key).toLowerCase();
    if (key === "q" || key === "a") armDirection = 0;
  };
  globalThis.addEventListener?.("keydown", onKeyDown);
  globalThis.addEventListener?.("keyup", onKeyUp);

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
  const updateRope = () => {
    const positions = ropeGeometry.getAttribute("position");
    if (!positions) return;
    for (let index = 0; index < segmentCount; index++) {
      const start = particles[index].position;
      const end = particles[index + 1].position;
      positions.setXYZ(index * 2, start.x, start.y, start.z);
      positions.setXYZ(index * 2 + 1, end.x, end.y, end.z);
    }
    positions.needsUpdate = true;
    ropeGeometry.computeBoundingSphere();
    ball.position.copy(particles[segmentCount].position);
  };
  function animate(timestamp) {
    animationFrame = requestFrame(animate);
    const delta =
      previousTimestamp === undefined
        ? 0
        : Math.min(0.1, Math.max(0, (timestamp - previousTimestamp) / 1000));
    previousTimestamp = timestamp;
    if (delta > 0) {
      setArm(armOffset + armDirection * delta * 1.5);
      world.update(delta);
    }
    updateRope();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate(0);
  return {
    update(params = {}) {
      if (params.arm !== undefined) setArm(Number(params.arm) || 0);
      if (params.reset === 1 || params.reset === "1") reset();
    },
    cleanup() {
      if (animationFrame !== undefined) cancelFrame(animationFrame);
      globalThis.removeEventListener?.("keydown", onKeyDown);
      globalThis.removeEventListener?.("keyup", onKeyUp);
      controlsInstance.dispose();
      world.dispose();
      scene.clear();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const rope = new EASEL.ParticleWorld({ gravity: new EASEL.Vector3(0, -9.81, 0) });
const particle = rope.addParticle({ position, mass: 0.08 });
rope.addDistanceConstraint(previousParticle, particle, { stiffness: 0.98 });
rope.update(deltaSeconds);
ropeGeometry.getAttribute("position").needsUpdate = true;`;

export const threeSource = `import * as THREE from "three";
import Ammo from "ammojs-typed";
const physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
const ropeSoftBody = softBodyHelpers.CreateRope(physicsWorld.getWorldInfo(), ropeStart, ropeEnd, segments - 1, 0);
physicsWorld.addSoftBody(ropeSoftBody, 1, -1);
physicsWorld.stepSimulation(deltaSeconds, 10);`;

export const example = { meta, controls, setup, easelSource, threeSource };
