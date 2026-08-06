import { directEasel, directThree, setupDirect } from "./direct_helpers.js";

export const meta = {
  id: "webgl_lines_colors",
  name: "Line Colors",
  category: "canvas",
  description: "CPU Canvas2D parity for the three.js Line Colors example.",
};
export const controls = [];
export function setup(canvas) {
  return setupDirect(canvas, "lines-colors");
}
export const easelSource = `import * as EASEL from "@xsyetopz/easel";

${directEasel["lines-colors"]}`;
export const threeSource = `import * as THREE from "three";

${directThree["lines-colors"]}`;
export const threeAdapterId = meta.id;
export const example = { meta, controls, setup, easelSource, threeSource };
