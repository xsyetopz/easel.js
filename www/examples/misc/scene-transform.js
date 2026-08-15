import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  TransformControls,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../runtime/example-animation.ts";

export const meta = {
  id: "scene-transform",
  name: "Scene Transform",
  category: "interaction",
  animated: true,
  description: "Translate, rotate, and scale a selected scene object.",
};

/** @type {import("../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "mode",
    label: "Transform mode",
    options: ["translate", "rotate", "scale"],
    default: "translate",
  },
];

function isTransformMode(value) {
  return value === "translate" || value === "rotate" || value === "scale";
}

export function setup(canvas, params = {}) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(3, 2, 6);
  camera.updateMatrixWorld(false, false, true);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrix();
  const renderer = new Renderer({ canvas, width, height });
  const ambient = new AmbientLight(0xffffff, 0.4);
  const directional = new DirectionalLight(0xffffff, 0.9);
  directional.position.set(4, 5, 6);
  scene.add(ambient, directional);
  const mesh = new Mesh(
    new BoxGeometry(1.5, 1.5, 1.5),
    new LambertMaterial({ color: 0x7f8792 }),
  );
  scene.add(mesh);
  const transform = new TransformControls(camera, canvas);
  transform.attach(mesh);
  transform.setMode(isTransformMode(params.mode) ? params.mode : "translate");
  scene.add(transform.helper);
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  transform.addEventListener("mouseDown", () => {
    orbit.enabled = false;
  });
  transform.addEventListener("mouseUp", () => {
    orbit.enabled = true;
  });
  const animation = createExampleAnimationLoop((_timestamp) => {
    orbit.update();
    transform.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    update(nextParams = {}) {
      if (isTransformMode(nextParams.mode)) transform.setMode(nextParams.mode);
    },
    cleanup() {
      animation.cleanup();
      transform.dispose();
      orbit.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const controls = new EASEL.TransformControls(camera, canvas);
controls.attach(mesh);
controls.setMode(params.mode ?? "translate");
`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
