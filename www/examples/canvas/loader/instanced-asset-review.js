import {
  makeInstancingDocument,
  mountGLTFExample,
} from "../../../fixtures/gltf_extension_fixtures.js";

export const meta = {
  id: "instanced-asset-review",
  name: "Instanced Asset Review",
  category: "assets",
  description:
    "Review repeated glTF parts without duplicating source geometry.",
};
export const controls = [];
export function setup(canvas) {
  return mountGLTFExample(canvas, makeInstancingDocument());
}
export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const result = new EASEL.GLTFLoader().parse(document);
scene.add(result.scene);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
