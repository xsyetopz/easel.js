import { directEasel, setupDirect } from "./direct_helpers.js";

export const meta = {
  id: "linework-overlay",
  name: "Linework Overlay",
  category: "materials",
  description: "Lay colored linework over a scene for routes and annotations.",
};
export const controls = [];
export function setup(canvas) {
  return setupDirect(canvas, "lines-colors");
}
export const easelSource = `import * as EASEL from "@xsyetopz/easel";
${directEasel["lines-colors"]}`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
