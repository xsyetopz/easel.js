import {
  AmbientLight,
  BoxGeometry,
  Capsule,
  CapsuleGeometry,
  CharacterController,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  Octree,
  PerspectiveCamera,
  Renderer,
  Scene,
  Triangle,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "physics_rapier_character_controller",
  name: "Rapier character controller",
  category: "physics",
  description: "Resolves a capsule controller against a CPU triangle floor.",
};
export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x172033;
  const camera = new PerspectiveCamera({
    fov: 48,
    aspect: width / height,
    near: 0.1,
    far: 60,
  });
  camera.position.set(0, 3.5, 8);
  camera.lookAt(new Vector3(0, 1, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.45));
  const light = new DirectionalLight(0xffffff, 1.2);
  light.position.set(2, 7, 5);
  scene.add(light);

  const floor = new Mesh(
    new BoxGeometry(10, 0.2, 8),
    new LambertMaterial({ color: 0x536b86 }),
  );
  floor.position.y = -0.1;
  scene.add(floor);
  const octree = new Octree();
  octree.addTriangle(
    new Triangle(
      new Vector3(-5, 0, -4),
      new Vector3(5, 0, -4),
      new Vector3(-5, 0, 4),
    ),
  );
  octree.addTriangle(
    new Triangle(
      new Vector3(5, 0, -4),
      new Vector3(5, 0, 4),
      new Vector3(-5, 0, 4),
    ),
  );
  const capsule = new Capsule(
    new Vector3(0, 0.35, 0),
    new Vector3(0, 1.65, 0),
    0.35,
  );
  const controller = new CharacterController({
    octree,
    capsule,
    gravity: new Vector3(0, -9.81, 0),
    fixedTimeStep: 1 / 60,
  });
  const character = new Mesh(
    new CapsuleGeometry(0.35, 1.3, 6, 16),
    new LambertMaterial({ color: 0xf0a34a }),
  );
  character.position.copy(controller.position);
  scene.add(character);
  let previous = 0;
  let frame;
  function animate(timestamp) {
    frame = globalThis.requestAnimationFrame(animate);
    const delta =
      previous === 0
        ? 0
        : Math.min(0.1, Math.max(0, (timestamp - previous) / 1000));
    previous = timestamp;
    controller.update(
      delta,
      new Vector3(Math.sin(timestamp * 0.001) * 1.2, 0, 0),
    );
    character.position.copy(controller.position);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate(0);
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      controller.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const controller = new EASEL.CharacterController({ octree, capsule });
controller.update(deltaSeconds, movement);
character.position.copy(controller.position);`;

export const threeSource = `import * as THREE from "three";
import { RapierPhysics } from "three/addons/physics/RapierPhysics.js";
const physics = await RapierPhysics();
const controller = physics.world.createCharacterController(0.01);
controller.computeColliderMovement(collider, movement);
character.position.add(controller.computedMovement());`;

export const example = { meta, controls, setup, easelSource, threeSource };
