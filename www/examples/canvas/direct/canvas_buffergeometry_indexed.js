import { directEasel, directThree, setupDirect } from "./direct_helpers.js";

export const meta = {
  id: "webgl_buffergeometry_indexed",
  name: "Indexed BufferGeometry",
  category: "canvas",
  description:
    "CPU Canvas2D parity for the three.js Indexed BufferGeometry example.",
};
export const controls = [];
export function setup(canvas) {
  return setupDirect(canvas, "indexed");
}
export const easelSource = `import * as EASEL from "@xsyetopz/easel";

${directEasel["indexed"]}`;
export const threeSource = `import * as THREE from "three";

${directThree["indexed"]}`;
export const threeAdapterId = meta.id;
export const example = { meta, controls, setup, easelSource, threeSource };
