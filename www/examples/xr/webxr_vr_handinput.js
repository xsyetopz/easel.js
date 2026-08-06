import {
  BasicMaterial,
  HemisphereLight,
  LambertMaterial,
  Mesh,
  SphereGeometry,
  Vector3,
} from "@/index.js";
import { addXRFloor, createXRInputPreview } from "./xr_input_helpers.js";

export const meta = {
  id: "webxr_vr_handinput",
  name: "VR hand input",
  category: "webxr",
  description:
    "Hand/controller poses and desktop pointer input drive CPU Canvas2D markers; native XR hand-model rendering and framebuffer submission stay device-bound.",
  gpuOnly: true,
  outOfScopeReason: "WebXR sessions require GPU/WebGPU rendering; Canvas2D markers cover client-side input",
};

export const controls = [];

export function setup(canvas) {
  const state = createXRInputPreview(canvas, {
    background: 0x444444,
    cameraPosition: [0, 1.6, 3],
    target: [0, 1.2, 0],
    initialStatus:
      "WebXR hand tracking unavailable · desktop Canvas2D hand-marker fallback",
    sessionInit: { requiredFeatures: ["hand-tracking"] },
  });
  addXRFloor(state.scene, 4, 4, 0x666666);
  state.scene.add(new HemisphereLight(0xbcbcbc, 0xa5a5a5, 0.44));
  const handGeometry = new SphereGeometry(0.1, 12, 8);
  const handMaterials = [
    new LambertMaterial({ color: 0x67c5e5 }),
    new LambertMaterial({ color: 0xf1a35c }),
  ];
  const markers = handMaterials.map((material, index) => {
    const marker = new Mesh(handGeometry, material);
    marker.position.set(index === 0 ? -0.35 : 0.35, 1.2, 0);
    state.scene.add(marker);
    return marker;
  });
  const palm = new Mesh(
    new SphereGeometry(0.07, 10, 6),
    new BasicMaterial({ color: 0xffffff, wireframe: true }),
  );
  state.scene.add(palm);
  const desktopPosition = new Vector3();
  const update = ({ inputStates, desktop, status }) => {
    if (inputStates.length > 0) {
      status.set(
        inputStates.some((input) => input.hand)
          ? "WebXR hand input active · CPU Canvas2D markers (no XR framebuffer)"
          : "WebXR controller input active · CPU Canvas2D markers",
      );
      for (let index = 0; index < markers.length; index++) {
        const input = inputStates[index];
        if (!input) {
          markers[index].visible = false;
          continue;
        }
        markers[index].visible = true;
        markers[index].position.copy(input.position);
      }
      palm.position
        .copy(markers[0].position)
        .add(markers[1].position)
        .multiplyScalar(0.5);
      return;
    }
    status.set(
      "WebXR hand tracking unavailable · desktop Canvas2D hand-marker fallback",
    );
    desktopPosition.set(desktop.x * 1.5, (desktop.y + 1) * 1.2, 0);
    markers[0].position.copy(desktopPosition);
    markers[1].position.set(
      -desktopPosition.x,
      desktopPosition.y,
      desktopPosition.z,
    );
    palm.position.copy(desktopPosition);
  };
  state.update = update;
  return state;
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
import { createXRInputPreview } from "./xr_input_helpers.js";

const preview = createXRInputPreview(canvas, {
  sessionInit: { requiredFeatures: ["hand-tracking"] },
});
const input = preview.inputStates[0];
if (input?.hand) handMarker.position.copy(input.position);`;

export const threeSource = `import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "three/addons/webxr/XRHandModelFactory.js";

renderer.xr.enabled = true;
const sessionInit = { requiredFeatures: ["hand-tracking"] };
globalThis.document?.body?.appendChild(VRButton.createButton(renderer, sessionInit));
const handFactory = new XRHandModelFactory();
const hand = renderer.xr.getHand(0);
hand.add(handFactory.createHandModel(hand));
scene.add(hand);`;

export const example = { meta, controls, setup, easelSource, threeSource };
