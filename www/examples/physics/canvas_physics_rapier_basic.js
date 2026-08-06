import {
  AABBShape,
  AmbientLight,
  BoxGeometry,
  CircleShape,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PhysicsWorld,
  Renderer,
  RigidBody,
  Scene,
  SphereGeometry,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "physics_rapier_basic",
  name: "Rapier Basic Physics",
  category: "physics",
  description:
    "A fixed-step CPU physics world drops box and circle bodies onto a Canvas2D floor without a WASM or GPU dependency.",
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
  scene.add(new AmbientLight(0xffffff, 0.4));
  const light = new DirectionalLight(0xffffff, 1.2);
  light.position.set(0, 8, 8);
  scene.add(light);

  const floor = new Mesh(
    new BoxGeometry(10, 0.5, 10),
    new LambertMaterial({ color: 0xe7ecef }),
  );
  floor.position.y = -0.25;
  scene.add(floor);
  const physics = new PhysicsWorld({
    gravity: new Vector3(0, -9.81, 0),
    fixedTimeStep: 1 / 60,
    maxSubSteps: 6,
  });
  physics.addBody(
    new RigidBody({
      node: floor,
      shape: new AABBShape(new Vector3(5, 0.25, 5)),
      mass: 0,
    }),
  );

  const bodies = [];
  for (let index = 0; index < 6; index++) {
    const isCircle = index % 2 === 1;
    const node = new Mesh(
      isCircle ? new SphereGeometry(0.5, 16, 10) : new BoxGeometry(1, 1, 1),
      new LambertMaterial({
        color: isCircle ? 0xf0a34a : 0x4e86c6,
      }),
    );
    node.position.set((index % 3) - 1, 2.5 + Math.floor(index / 3) * 1.4, 0);
    scene.add(node);
    const body = new RigidBody({
      node,
      shape: isCircle
        ? new CircleShape(0.5)
        : new AABBShape(new Vector3(0.5, 0.5, 0.5)),
      mass: 1,
      restitution: 0.35,
      friction: 0.3,
    });
    physics.addBody(body);
    bodies.push(body);
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
      bodies.length = 0;
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const physics = new EASEL.PhysicsWorld({ gravity: new EASEL.Vector3(0, -9.81, 0) });
physics.addBody(new EASEL.RigidBody({
  node: floor,
  shape: new EASEL.AABBShape(new EASEL.Vector3(5, 0.25, 5)),
  mass: 0,
}));
physics.addBody(new EASEL.RigidBody({
  node: mesh,
  shape: new EASEL.AABBShape(new EASEL.Vector3(0.5, 0.5, 0.5)),
  mass: 1,
  restitution: 0.5,
}));
physics.update(deltaSeconds);`;

export const threeSource = `import * as THREE from "three";
import { RapierPhysics } from "three/addons/physics/RapierPhysics.js";

const physics = await RapierPhysics();
physics.addScene(scene);
const floor = new THREE.Mesh(
  new THREE.BoxGeometry(10, 0.5, 10),
  new THREE.MeshStandardMaterial({ color: 0xffffff }),
);
floor.position.y = -0.25;
floor.userData.physics = { mass: 0 };
scene.add(floor);
physics.addMesh(mesh, 1, 0.5);
physics.world.step();`;

export const example = { meta, controls, setup, easelSource, threeSource };
