import {
  BasicMaterial,
  BoxGeometry,
  LambertMaterial,
  Mesh,
  Vector3,
} from "@/index.js";
import { addXRFloor, createXRInputPreview } from "./xr_input_helpers.js";

export const meta = {
  id: "webxr_xr_cubes",
  name: "XR cubes",
  category: "webxr",
  description:
    "Controller select and desktop pointer input drive a CPU Canvas2D room of bounded cubes; XR frame submission is intentionally not used.",
  gpuOnly: true,
  outOfScopeReason: "WebXR rendered through GPU/WebGPU sessions; no CPU fallback available",
};

export const controls = [];

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function setup(canvas) {
  const state = createXRInputPreview(canvas, {
    background: 0x505050,
    cameraPosition: [0, 1.6, 3],
    target: [0, 2.4, 0],
    initialStatus:
      "WebXR unavailable · desktop Canvas2D pointer/select fallback",
    sessionInit: {
      optionalFeatures: ["local-floor", "bounded-floor", "depth-sensing"],
    },
  });
  const room = new Mesh(
    new BoxGeometry(6, 6, 6),
    new BasicMaterial({ color: 0xbcbcbc, wireframe: true }),
  );
  room.position.y = 3;
  state.scene.add(room);
  addXRFloor(state.scene, 6, 6, 0x3e4248);

  const random = seededRandom(0x43554245);
  const geometry = new BoxGeometry(0.15, 0.15, 0.15);
  const cubes = [];
  for (let index = 0; index < 200; index++) {
    const material = new LambertMaterial({
      color: Math.floor(random() * 0xffffff),
    });
    const cube = new Mesh(geometry, material);
    cube.position.set(random() * 4 - 2, random() * 4, random() * 4 - 2);
    cube.rotation.x = random() * Math.PI * 2;
    cube.rotation.y = random() * Math.PI * 2;
    cube.rotation.z = random() * Math.PI * 2;
    cube.scale.set(random() + 0.5, random() + 0.5, random() + 0.5);
    cube.userData.velocity = new Vector3(
      random() * 0.01 - 0.005,
      random() * 0.01 - 0.005,
      random() * 0.01 - 0.005,
    );
    cube.userData.baseColor = material.color.hex;
    room.add(cube);
    cubes.push(cube);
  }

  let intersected;
  const setHighlighted = (cube, active) => {
    if (!cube?.material?.color) return;
    cube.material.color.set(active ? 0xff3333 : cube.userData.baseColor);
  };
  const findNearest = (position) => {
    let nearest;
    let distance = 0.18 * 0.18;
    for (const cube of cubes) {
      const dx = cube.position.x - position.x;
      const dy = cube.position.y - position.y;
      const dz = cube.position.z - position.z;
      const next = dx * dx + dy * dy + dz * dz;
      if (next < distance) {
        distance = next;
        nearest = cube;
      }
    }
    return nearest;
  };

  const launch = (position, direction, delta) => {
    const cube = cubes.shift();
    if (!cube) return;
    room.remove(cube);
    cube.position.copy(position);
    cube.userData.velocity.set(
      direction.x * 0.05 * delta,
      direction.y * 0.05 * delta,
      direction.z * 0.05 * delta,
    );
    room.add(cube);
    cubes.push(cube);
  };

  const update = ({ delta, inputStates, desktop }) => {
    const activeInput = inputStates.find((input) => input.selecting);
    if (activeInput) launch(activeInput.position, activeInput.direction, 60);
    if (desktop.active) {
      const pointer = new Vector3(desktop.x * 2.5, (desktop.y + 1) * 3, 2.8);
      launch(pointer, new Vector3(desktop.x, desktop.y, -1).normalize(), 1);
    }

    const candidate = activeInput
      ? findNearest(activeInput.position)
      : undefined;
    if (intersected !== candidate) {
      setHighlighted(intersected, false);
      setHighlighted(candidate, true);
      intersected = candidate;
    }
    for (const cube of cubes) {
      const velocity = cube.userData.velocity;
      velocity.multiplyScalar(1 - 0.001 * Math.max(0, delta * 60));
      cube.position.addScaledVector(velocity, Math.max(0, delta * 60));
      if (cube.position.x < -3 || cube.position.x > 3) {
        cube.position.x = clamp(cube.position.x, -3, 3);
        velocity.x = -velocity.x;
      }
      if (cube.position.y < 0 || cube.position.y > 6) {
        cube.position.y = clamp(cube.position.y, 0, 6);
        velocity.y = -velocity.y;
      }
      if (cube.position.z < -3 || cube.position.z > 3) {
        cube.position.z = clamp(cube.position.z, -3, 3);
        velocity.z = -velocity.z;
      }
      cube.rotation.x += velocity.x * 2 * delta * 60;
      cube.rotation.y += velocity.y * 2 * delta * 60;
      cube.rotation.z += velocity.z * 2 * delta * 60;
    }
  };
  state.update = update;
  return state;
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
import { createXRInputPreview } from "./xr_input_helpers.js";

const preview = createXRInputPreview(canvas);
const controller = preview?.inputStates[0];
if (controller?.selecting) cube.position.copy(controller.position);
`;

export const threeSource = `import * as THREE from "three";
import { XRButton } from "three/addons/webxr/XRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

renderer.xr.enabled = true;
renderer.setAnimationLoop(animate);
const controller = renderer.xr.getController(0);
controller.addEventListener("selectstart", onSelectStart);
controller.addEventListener("selectend", onSelectEnd);
scene.add(controller);
const modelFactory = new XRControllerModelFactory();
renderer.xr.getControllerGrip(0).add(modelFactory.createControllerModel(controllerGrip));
globalThis.document?.body?.appendChild(XRButton.createButton(renderer, { optionalFeatures: ["depth-sensing"] }));`;

export const example = { meta, controls, setup, easelSource, threeSource };
