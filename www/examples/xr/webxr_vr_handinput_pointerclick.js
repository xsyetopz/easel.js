import { Mesh, SphereGeometry } from "@/index.js";
import { createXRInputPreview } from "./xr_input_helpers.js";

export const meta = {
  id: "webxr_vr_handinput_pointerclick",
  name: "XR VR hand input pointer click",
  category: "webxr",
  description: "Controller pointer click drives CPU Canvas2D markers; XR click events out of scope.",
  gpuOnly: true,
  outOfScopeReason: "WebXR session requires GPU rendering; touches handled by CPU pointer events only.",
};

export const controls = [];

export function setup(canvas) {
  const state = createXRInputPreview(canvas, { });


  const cursor = new Mesh(new SphereGeometry(0.1), Mesh.LambertMaterial({ color: 0xff0000 }));
  state.scene.add(cursor);
  state.update = () => {};
  return state;
}

export const example = { meta, controls, setup };
