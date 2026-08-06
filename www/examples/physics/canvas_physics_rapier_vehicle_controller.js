import {
  AABBShape,
  AmbientLight,
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  PhysicsWorld,
  Renderer,
  RigidBody,
  Scene,
  VehicleController,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "physics_rapier_vehicle_controller",
  name: "Rapier vehicle controller",
  category: "physics",
  description:
    "A CPU vehicle controller drives a four-wheel chassis over a Canvas2D ground collider with keyboard input.",
};

export const controls = [];

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
  camera.position.set(0, 4, 10);
  camera.lookAt(new Vector3(0, 1, 0));
  const renderer = new Renderer({ canvas, width, height });
  const orbitControls = new OrbitControls(camera, canvas);
  orbitControls.target.set(0, 1, 0);
  orbitControls.update();
  scene.add(new AmbientLight(0xffffff, 0.5));
  const light = new DirectionalLight(0xffffff, 2.4);
  light.position.set(4, 12, 10);
  scene.add(light);

  const ground = new Mesh(
    new BoxGeometry(40, 0.5, 40),
    new LambertMaterial({ color: 0xe7ecef }),
  );
  ground.position.set(0, -0.25, -10);
  scene.add(ground);

  const physics = new PhysicsWorld({
    gravity: new Vector3(0, -9.81, 0),
    fixedTimeStep: 1 / 60,
    maxSubSteps: 6,
  });
  physics.addBody(
    new RigidBody({
      node: ground,
      shape: new AABBShape(new Vector3(20, 0.25, 20)),
      position: ground.position,
      mass: 0,
    }),
  );

  const chassis = new Mesh(
    new BoxGeometry(2, 1, 4),
    new LambertMaterial({ color: 0xd33434 }),
  );
  chassis.position.set(0, 1.4, -4);
  scene.add(chassis);
  const chassisBody = new RigidBody({
    node: chassis,
    shape: new AABBShape(new Vector3(1, 0.5, 2)),
    mass: 10,
    restitution: 0.1,
    friction: 0.85,
  });
  physics.addBody(chassisBody);
  const vehicle = new VehicleController({
    chassis: chassisBody,
    world: physics,
  });
  const wheelNodes = [];
  const wheelPositions = [
    new Vector3(-1, -0.25, -1.5),
    new Vector3(1, -0.25, -1.5),
    new Vector3(-1, -0.25, 1.5),
    new Vector3(1, -0.25, 1.5),
  ];
  for (const position of wheelPositions) {
    vehicle.addWheel(position, new Vector3(0, -1, 0), new Vector3(-1, 0, 0));
    const wheel = new Mesh(
      new CylinderGeometry(0.3, 0.3, 0.4, 16),
      new LambertMaterial({ color: 0x202020 }),
    );
    wheel.rotateZ(Math.PI * 0.5);
    chassis.add(wheel);
    wheelNodes.push(wheel);
  }

  const input = { forward: 0, right: 0, brake: 0, reset: false };
  function onKeyDown(event) {
    const key = String(event.key).toLowerCase();
    if (key === "w" || key === "arrowup") input.forward = 1;
    if (key === "s" || key === "arrowdown") input.forward = -1;
    if (key === "a" || key === "arrowleft") input.right = 1;
    if (key === "d" || key === "arrowright") input.right = -1;
    if (key === "r") input.reset = true;
    if (key === " ") input.brake = 1;
  }
  function onKeyUp(event) {
    const key = String(event.key).toLowerCase();
    if (key === "w" || key === "s" || key === "arrowup" || key === "arrowdown")
      input.forward = 0;
    if (
      key === "a" ||
      key === "d" ||
      key === "arrowleft" ||
      key === "arrowright"
    )
      input.right = 0;
    if (key === "r") input.reset = false;
    if (key === " ") input.brake = 0;
  }
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
  function animate(timestamp) {
    animationFrame = requestFrame(animate);
    const delta =
      previousTimestamp === undefined
        ? 0
        : Math.min(0.1, Math.max(0, (timestamp - previousTimestamp) / 1000));
    previousTimestamp = timestamp;
    vehicle.setWheelSteering(0, input.right * (Math.PI / 4));
    vehicle.setWheelSteering(1, input.right * (Math.PI / 4));
    vehicle.update(delta, input);
    for (let index = 0; index < wheelNodes.length; index++) {
      const wheel = wheelNodes[index];
      const position = vehicle.wheelChassisConnectionPointCs(index);
      position.y -= vehicle.wheelSuspensionLength(index);
      wheel.position.copy(position);
      wheel.rotation.y = vehicle.wheelSteering(index);
      wheel.rotation.x = vehicle.wheelRotation(index);
    }
    physics.update(delta);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate(0);
  return {
    update(params = {}) {
      if (params.forward !== undefined)
        input.forward = Number(params.forward) || 0;
      if (params.right !== undefined) input.right = Number(params.right) || 0;
      if (params.brake !== undefined) input.brake = Number(params.brake) || 0;
      if (params.reset === 1 || params.reset === "1") input.reset = true;
    },
    cleanup() {
      if (animationFrame !== undefined) cancelFrame(animationFrame);
      globalThis.removeEventListener?.("keydown", onKeyDown);
      globalThis.removeEventListener?.("keyup", onKeyUp);
      orbitControls.dispose();
      vehicle.dispose();
      physics.dispose();
      scene.clear();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const vehicle = new EASEL.VehicleController({ chassis: chassisBody, world: physics });
vehicle.addWheel(new EASEL.Vector3(-1, 0, -1.5), new EASEL.Vector3(0, -1, 0), new EASEL.Vector3(-1, 0, 0), 0.8, 0.3);
vehicle.setInput({ forward, right, brake });
vehicle.update(deltaSeconds);
physics.update(deltaSeconds);`;

export const threeSource = `import * as THREE from "three";
import { RapierPhysics } from "three/addons/physics/RapierPhysics.js";
const physics = await RapierPhysics();
const vehicleController = physics.world.createVehicleController(chassis);
vehicleController.addWheel(wheelPosition, wheelDirection, wheelAxle, suspensionRestLength, wheelRadius);
vehicleController.setWheelSteering(0, Math.PI / 4);
vehicleController.setWheelEngineForce(0, accelerateForce);
physics.world.step();`;

export const example = { meta, controls, setup, easelSource, threeSource };
