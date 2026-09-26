import {
  AmbientLight,
  LambertMaterial,
  OBJLoader,
  OrbitControls,
  PerspectiveCamera,
  PointLight,
  Renderer,
  Scene,
} from "@/index.js";

import suzanneText from "../../../../fixtures/models/suzanne/suzanne.obj?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_loader_obj",
  upstream: "webgl_loader_obj",
  name: "loader / obj",
  category: "canvas",
  animated: true,
  description:
    "Parse a Wavefront OBJ model with OBJLoader, light it from the camera with a point light, and orbit it with damping.",
  differences: [
    "Both sides load the CC0 Suzanne OBJ instead of the unlicensed male02 model, so there is no MTL file and no texture; the scale is 0.8 and position.y is 0 instead of 0.01 and -0.95 so Suzanne fills the view about as much as male02 does.",
    "three.js falls back to a white MeshPhongMaterial when no MTL is set; EASEL has no Phong material and its OBJLoader falls back to an unlit BasicMaterial, so the port passes a white LambertMaterial for the Suzanne usemtl group through setMaterials and has no specular highlight.",
    "Lighting is baked per vertex (Gouraud) instead of per pixel.",
    "Edges are aliased because EASEL has no antialiasing.",
  ],
};
export const controls = [];

export function setup(canvas) {
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: canvas.width / canvas.height,
    near: 0.1,
    far: 20,
  });
  camera.position.z = 2.5;

  // scene

  const scene = new Scene();

  const ambientLight = new AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const pointLight = new PointLight(0xffffff, 15);
  camera.add(pointLight);
  scene.add(camera);

  // model

  const material = new LambertMaterial({ color: 0xffffff });

  const objLoader = new OBJLoader();
  objLoader.setMaterials({ Suzanne: material });

  const object = objLoader.parse(suzanneText);

  object.position.y = 0;
  object.scale.setScalar(0.8);
  scene.add(object);

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.minDistance = 2;
  orbit.maxDistance = 5;

  const animation = createExampleAnimationLoop(() => {
    orbit.update();

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    },
    cleanup() {
      animation.cleanup();
      orbit.dispose();
      object.traverse((child) => {
        child.geometry?.dispose();
      });
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

scene.add(new EASEL.AmbientLight(0xffffff, 1));
camera.add(new EASEL.PointLight(0xffffff, 15));
scene.add(camera);

const objLoader = new EASEL.OBJLoader();
objLoader.setMaterials({ Suzanne: new EASEL.LambertMaterial({ color: 0xffffff }) });
const object = objLoader.parse(suzanneText);
object.scale.setScalar(0.8);
scene.add(object);

const orbit = new EASEL.OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.update();
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
