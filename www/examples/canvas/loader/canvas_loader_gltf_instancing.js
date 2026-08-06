import {
  mountGLTFExample,
  makeInstancingDocument,
} from "./gltf_extension_fixtures.js";

export const meta = {
  id: "webgl_loader_gltf_instancing",
  name: "glTF instancing",
  category: "canvas",
  description:
    "Decodes EXT_mesh_gpu_instancing into CPU instance transforms and colors.",
};
export const controls = [];
export function setup(canvas) {
  return mountGLTFExample(canvas, makeInstancingDocument());
}
export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const result = new EASEL.GLTFLoader().parse(document);
scene.add(result.scene);`;
export const threeSource = `import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
loader.parse(arrayBuffer, "", (gltf) => scene.add(gltf.scene));`;
export const example = { meta, controls, setup, easelSource, threeSource };
