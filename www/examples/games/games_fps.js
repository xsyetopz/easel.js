import {
  BoxGeometry,
  Capsule,
  LambertMaterial,
  Mesh,
  Octree,
  PointerLockControls,
  Vector3,
} from "@/index.js";
import {
  createScene,
  runLoop,
} from "../canvas/interaction/canvas_interaction_helpers.js";

export const meta = {
  id: "games_fps",
  name: "First-person game",
  category: "games",
  description:
    "A CPU Canvas2D first-person movement and capsule collision demo.",
};
export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [0, 1.6, 5],
    target: [0, 1.6, 0],
    fov: 70,
  });
  const controls = new PointerLockControls(camera, canvas);
  const collisionWorld = new Octree();
  const floor = new Mesh(
    new BoxGeometry(24, 0.5, 24),
    new LambertMaterial({ color: 0x4a5563 }),
  );
  floor.position.y = -0.25;
  scene.add(floor);
  for (let index = 0; index < 24; index++) {
    const block = new Mesh(
      new BoxGeometry(1.5, 1.5 + (index % 3), 1.5),
      new LambertMaterial({ color: index % 2 ? 0x5b9fe0 : 0xe4b85f }),
    );
    block.position.set(
      (index % 6) * 3 - 7.5,
      0.75 + (index % 3) * 0.75,
      -Math.floor(index / 6) * 3 - 3,
    );
    scene.add(block);
  }
  collisionWorld.fromGraphNode(scene);
  const player = new Capsule(
    new Vector3(0, 0.35, 5),
    new Vector3(0, 1.65, 5),
    0.35,
  );
  const velocity = new Vector3();
  const direction = new Vector3();
  const keys = new Set();
  const onKeyDown = (event) => {
    keys.add(event.code);
    if (
      event.code === "Space" &&
      controls.isLocked &&
      Math.abs(velocity.y) < 0.1
    )
      velocity.y = 5;
  };
  const onKeyUp = (event) => keys.delete(event.code);
  const onClick = () => controls.lock();
  globalThis.addEventListener("keydown", onKeyDown);
  globalThis.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("click", onClick);
  return runLoop(
    renderer,
    scene,
    camera,
    (_time, delta) => {
      if (!controls.isLocked) return;
      direction.set(0, 0, 0);
      if (keys.has("KeyW")) direction.z -= 1;
      if (keys.has("KeyS")) direction.z += 1;
      if (keys.has("KeyA")) direction.x -= 1;
      if (keys.has("KeyD")) direction.x += 1;
      if (direction.lengthSq > 0) {
        direction.normalize().applyQuaternion(camera.quaternion);
        direction.y = 0;
        direction.normalize();
        velocity.x = direction.x * 4;
        velocity.z = direction.z * 4;
      } else {
        velocity.x *= 0.8;
        velocity.z *= 0.8;
      }
      velocity.y -= 9.8 * delta;
      player.translate(direction.copy(velocity).multiplyScalar(delta));
      const collision = collisionWorld.capsuleIntersect(player);
      if (collision) {
        const normalSpeed = velocity.dot(collision.normal);
        if (normalSpeed < 0)
          velocity.addScaledVector(collision.normal, -normalSpeed);
      }
      camera.position.copy(player.end);
      camera.updateMatrixWorld(false, true);
    },
    [
      () => globalThis.removeEventListener("keydown", onKeyDown),
      () => globalThis.removeEventListener("keyup", onKeyUp),
      () => canvas.removeEventListener("click", onClick),
      () => controls.dispose(),
    ],
  );
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const controls = new EASEL.PointerLockControls(camera, renderer.domElement);
const player = new EASEL.Capsule(start, end, 0.35);
const world = new EASEL.Octree().fromGraphNode(scene);`;

export const threeSource = `import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { Octree } from "three/addons/math/Octree.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const controls = new PointerLockControls(camera, renderer.domElement);
const player = new Capsule(start, end, 0.35);
const world = new Octree().fromGraphNode(scene);`;

export const example = { meta, controls, setup, easelSource, threeSource };
