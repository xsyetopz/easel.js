import { Mesh } from "@/index.js";

export const meta = {
  id: "webxr_xr_haptics",
  name: "XR XR haptics",
  category: "webxr",
  description: "Controller rumble LED; haptics feedback output to test console, not immersive rendering。",
  gpuOnly: true,
  outOfScopeReason: "WebXR haptics与XR session绑定; EASEL仅提供日志记录与CPU可视化请求。",
};

export const controls = [];

export function setup(canvas) {
  console.log("Haptics:.");

  const state = { scene: canvas.parentNode };
  const indicator = new Mesh(Mesh.SphereGeometry(0.1), Mesh.LambertMaterial());
  state.scene.add(indicator);
  state.update = () => {};
  return state;
}

export const example = { meta, controls, setup };
