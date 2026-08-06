import {
  AABBShape,
  AmbientLight,
  CapsuleGeometry,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PhysicsJoints,
  PhysicsWorld,
  Renderer,
  RigidBody,
  Scene,
  SphereGeometry,
  SphericalJoint,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "physics_rapier_joints",
  name: "Rapier joints",
  category: "physics",
  description:
    "A CPU Canvas2D chain keeps spherical anchors together without Rapier WASM.",
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
  camera.position.set(0, 3, 10);
  camera.lookAt(new Vector3(0, 2, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.45));
  const light = new DirectionalLight(0xffffff, 1.8);
  light.position.set(0, 10, 8);
  scene.add(light);

  const world = new PhysicsWorld({
    gravity: new Vector3(0, -9.81, 0),
    fixedTimeStep: 1 / 60,
    maxSubSteps: 6,
  });
  const physics = new PhysicsJoints({ world, iterations: 4 });
  const pivot = new Mesh(
    new SphereGeometry(0.5, 16, 10),
    new LambertMaterial({ color: 0xff0000 }),
  );
  pivot.position.y = 6;
  scene.add(pivot);
  const pivotBody = new RigidBody({
    node: pivot,
    shape: new AABBShape(new Vector3(0.2, 0.2, 0.2)),
    mass: 0,
  });
  world.addBody(pivotBody);

  const links = [];
  let parentBody = pivotBody;
  for (let index = 0; index < 3; index++) {
    const link = new Mesh(
      new CapsuleGeometry(0.25, 1.8, 8, 16),
      new LambertMaterial({ color: 0xcccc00 }),
    );
    link.rotateZ(Math.PI * 0.5);
    link.position.set(0.9 + index * 1.8, 5.8, 0);
    scene.add(link);
    const linkBody = new RigidBody({
      node: link,
      shape: new AABBShape(new Vector3(0.8, 0.2, 0.2)),
      mass: 1,
      friction: 0.1,
    });
    world.addBody(linkBody);
    physics.addJoint(
      new SphericalJoint({
        bodyA: parentBody,
        bodyB: linkBody,
        anchorA: index === 0 ? new Vector3(0, -0.2, 0) : new Vector3(0.9, 0, 0),
        anchorB: new Vector3(-0.9, 0, 0),
      }),
    );
    links.push(linkBody);
    parentBody = linkBody;
  }

  let previousTimestamp;
  let animationFrame;
  function animate(timestamp) {
    animationFrame = globalThis.requestAnimationFrame(animate);
    if (previousTimestamp !== undefined) {
      physics.update(
        Math.min(0.1, Math.max(0, (timestamp - previousTimestamp) / 1000)),
      );
    }
    previousTimestamp = timestamp;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate(0);
  return {
    cleanup() {
      if (animationFrame !== undefined)
        globalThis.cancelAnimationFrame(animationFrame);
      physics.dispose();
      links.length = 0;
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const physics = new EASEL.PhysicsJoints({ world, iterations: 4 });
physics.addJoint(new EASEL.SphericalJoint({
  bodyA: pivotBody,
  bodyB: linkBody,
  anchorA: new EASEL.Vector3(0, -0.2, 0),
  anchorB: new EASEL.Vector3(-0.9, 0, 0),
}));
physics.update(deltaSeconds);`;

export const threeSource = `import * as THREE from "three";
import { RapierPhysics } from "three/addons/physics/RapierPhysics.js";
const physics = await RapierPhysics();
physics.addScene(scene);
const jointParams = physics.RAPIER.JointData.spherical(
  new physics.RAPIER.Vector3(0, -0.5, 0),
  new physics.RAPIER.Vector3(0, 1.15, 0),
);
physics.world.createImpulseJoint(jointParams, body1, body2, true);`;

export const example = { meta, controls, setup, easelSource, threeSource };
