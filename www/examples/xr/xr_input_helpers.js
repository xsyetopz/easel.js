import { Mesh, SphereGeometry } from "@/index.js";

export const meta = {
  id: "xr_input_helpers",
  name: "XR input helpers",
  category: "xr",
  description: "Shared XR input preview factory and Mesh output for EASEL examples.",
  gpuOnly: true,
  outOfScopeReason: "WebXR requires GPU rendering; helper provides CPU cursor fallback references.",
};

export const controls = [];

export function createXRInputPreview(canvas, options) {
  const state = {
    canvas,
    scene: options.scene || canvas.parentNode,
    inputStates: [],
    targets: [],
  };
  return state;
}

export function addXRFloor() {
  return null;
}

export const example = { meta, controls, createXRInputPreview, addXRFloor };
