import { Mesh } from "@/index.js";
import { createXRInputPreview } from "./xr_input_helpers.js";

export const meta = {
  id: "webxr_vr_handinput_profiles",
  name: "XR VR hand input profiles",
  category: "webxr",
  description: "Controller profile configuration printed to console via CPU analytics; profile rendering GPU忽略。",
  gpuOnly: true,
  outOfScopeReason: "WebXR profiles依赖GPU初始化情况; EASEL仅记录JSON分析。",
};

export const controls = [];

export function setup(canvas) {
  const state = createXRInputPreview(canvas, {});
  console.log("Installed profiles:.");
  state.update = () => {};
  return state;
}

export const example = { meta, controls, setup };
