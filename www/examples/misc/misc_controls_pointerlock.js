import {
  BoxGeometry,
  LambertMaterial,
  Mesh,
  PointerLockControls,
} from "@/index.js";
import {
  createScene,
  runLoop,
} from "../canvas/interaction/canvas_interaction_helpers.js";

export const meta = {
  id: "misc_controls_pointerlock",
  name: "Pointer Lock Controls",
  category: "misc",
  description: "Use browser pointer lock and keyboard movement in a CPU scene.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [0, 1.5, 8],
    target: [0, 1, 0],
  });
  const pointerLock = new PointerLockControls(camera, canvas);
  const objects = [];
  for (let index = 0; index < 40; index++) {
    const mesh = new Mesh(
      new BoxGeometry(0.7, 0.7, 0.7),
      new LambertMaterial({ color: index % 2 ? 0x5b9fe0 : 0xe4b85f }),
    );
    mesh.position.set(
      ((index * 17) % 11) - 5,
      (index % 4) * 0.8,
      -Math.floor(index / 4) * 2,
    );
    scene.add(mesh);
    objects.push(mesh);
  }
  const onClick = () => pointerLock.lock();
  canvas.addEventListener("click", onClick);
  return runLoop(
    renderer,
    scene,
    camera,
    (_time, delta) => {
      if (pointerLock.isLocked) {
        pointerLock.moveForward(delta * 3);
        if (objects.length > 0) objects[0].rotation.y += delta * 0.4;
      }
    },
    [
      () => canvas.removeEventListener("click", onClick),
      () => pointerLock.dispose(),
    ],
  );
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const controls = new EASEL.PointerLockControls(camera, renderer.domElement);
controls.addEventListener("lock", onLock);
controls.addEventListener("unlock", onUnlock);
controls.lock();`;

export const threeSource = `import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const controls = new PointerLockControls(camera, renderer.domElement);
controls.addEventListener("lock", onLock);
controls.addEventListener("unlock", onUnlock);
controls.lock();`;

export const example = { meta, controls, setup, easelSource, threeSource };
