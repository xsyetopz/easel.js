import { Mesh, BoxGeometry } from "@/index.js";
import { createXRInputPreview } from "./xr_input_helpers.js";

export const meta = {
  id: "webxr_vr_handinput_pointerdrag",
  name: "XR VR hand input pointer drag",
  category: "webxr",
  description: "Controller pointer drag moves CPU objects flat; drag events GPU-bound.",
  gpuOnly: true,
  outOfScopeReason: "WebXR传来需要GPU渲染;仅保留CPU平面拖拽逻辑。",
};

export const controls = [];

export function setup(canvas) {
  const state = createXRInputPreview(canvas, {});
  const box = new Mesh(new BoxGeometry(1, 1, 1), Mesh.LambertMaterial({ color: 0x00ff00 }));
  state.scene.add(box);
  state.update = () => {};
  return state;
}

export const example = { meta, controls, setup };
