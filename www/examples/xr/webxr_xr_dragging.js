import { Mesh, BoxGeometry } from "@/index.js";

export const meta = {
  id: "webxr_xr_dragging",
  name: "XR XR dragging",
  category: "webxr",
  description: "Pointer dragging drives CPU object Manhattan distance; drag priorities GPU-bound.",
  gpuOnly: true,
  outOfScopeReason: "WebXR picking链对GPU渲染才有完整交互能力; EASEL仅返回平面交互结果。",
};

export const controls = [];

export function setup(canvas) {
  const state = { scene: canvas.parentNode };
  const cube = new Mesh(new BoxGeometry(1, 1, 1), Mesh.LambertMaterial({ color: 0x0000ff }));
  state.scene.add(cube);
  state.inverseProjector = (x, y) => ({ x, y });
  state.update = () => {};
  return state;
}

export const example = { meta, controls, setup };
