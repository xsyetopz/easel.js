import { Mesh } from "@/index.js";
import { createXRInputPreview } from "./xr_input_helpers.js";

export const meta = {
  id: "webxr_vr_handinput_pressbutton",
  name: "XR VR hand input press button",
  category: "webxr",
  description: "Controller button press triggers CPU VisualFeedback; button events GPU sessions not covered.",
  gpuOnly: true,
  outOfScopeReason: "WebXR亲自需要GPU渲染;按压由CPU键盘事件代理传感器。",
};

export const controls = [];

export function setup(canvas) {
  const state = createXRInputPreview(canvas, {});
  console.log("Press button handled in UI layer, not via XR session");
  state.update = () => {};
  return state;
}

export const example = { meta, controls, setup };
