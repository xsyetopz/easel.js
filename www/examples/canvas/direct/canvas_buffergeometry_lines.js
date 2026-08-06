import { directEasel, directThree, setupDirect } from "./direct_helpers.js";

export const meta = {
  id: "webgl_buffergeometry_lines",
  name: "BufferGeometry Lines",
  category: "canvas",
  description:
    "CPU Canvas2D parity for the three.js BufferGeometry Lines example.",
};
export const controls = [];
export function setup(canvas) {
  return setupDirect(canvas, "lines");
}
export const easelSource = `import * as EASEL from "@xsyetopz/easel";

${directEasel["lines"]}`;
export const threeSource = `import * as THREE from "three";

${directThree["lines"]}`;
export const threeAdapterId = meta.id;
export const example = { meta, controls, setup, easelSource, threeSource };
