import { directEasel, directThree, setupDirect } from "./direct_helpers.js";

export const meta = {
  id: "webgl_camera",
  name: "Camera",
  category: "canvas",
  description: "CPU Canvas2D parity for the three.js Camera example.",
};
export const controls = [];
export function setup(canvas) {
  return setupDirect(canvas, "camera");
}
export const easelSource = `import * as EASEL from "@xsyetopz/easel";

${directEasel["camera"]}`;
export const threeSource = `import * as THREE from "three";

${directThree["camera"]}`;
export const threeAdapterId = meta.id;
export const example = { meta, controls, setup, easelSource, threeSource };
