import { BasicMaterial, BoxGeometry, Mesh, Vector3 } from "@/index.js";
import { createXRInputPreview } from "./xr_input_helpers.js";

export const meta = {
  id: "webxr_vr_handinput_cubes",
  name: "XR VR hand input cubes",
  category: "webxr",
  description: "Controller select drive a CPU Canvas2D room of bounded cubes; XR frame submission not used。",
  gpuOnly: true,
  outOfScopeReason: "WebXR sessions require GPU/WebGPU rendering; Canvas2D input covers client-side interaction",
};

export const controls = [];

export function setup(canvas) {
  const state = createXRInputPreview(canvas, {
    background: 0x505050,
    cameraPosition: [0, 1.6, 3],
    target: [0, 1.2, 0],
    initialStatus: "WebXR unavailable · desktop Canvas2D fallback",
  });
  const room = new Mesh(
    new BoxGeometry(6, 6, 6),
    new BasicMaterial({ color: 0xbcbcbc, wireframe: true }),
  );
  room.position.y = 3;
  state.scene.add(room);
  const cubes = [];
  for (let i = 0; i < 50; i++) {
    const cube = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), new BasicMaterial({ color: Math.random() * 0xffffff }));
    cube.position.set(Math.random() * 4 - 2, Math.random() * 4, Math.random() * 4 - 2);
    cube.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    room.add(cube);
    cubes.push(cube);
  }
  state.update = () => {};
  return state;
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
import { createXRInputPreview } from "./xr_input_helpers.js";

const preview = createXRInputPreview(canvas);
if (preview?.inputStates[0]?.selecting) cube.position.copy(preview.inputStates[0].position);`;

export const threeSource = `import * as THREE from "three";
import { XRButton } from "three/addons/webxr/XRButton.js";

renderer.xr.enabled = true;
renderer.setAnimationLoop(animate);
const controller = renderer.xr.getController(0);
controller.addEventListener("selectstart", onSelectStart);
scene.add(controller);
globalThis.document?.body?.appendChild(XRButton.createButton(renderer));`;

export const example = { meta, controls, setup, easelSource, threeSource };
