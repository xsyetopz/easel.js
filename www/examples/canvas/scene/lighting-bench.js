import {
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  HemisphereLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  SphereGeometry,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { aimCamera } from "../../../runtime/example-camera.ts";

export const meta = {
  id: "lighting-bench",
  name: "Lighting Bench",
  category: "materials",
  animated: true,
  description:
    "Compare two light rigs against the same fixed forms and materials.",
};
/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "rig",
    label: "Lighting rig",
    options: ["daylight", "studio"],
    default: "daylight",
  },
];

function applyRig(lights, rig) {
  const studio = rig === "studio";
  lights.hemisphere.intensity = studio ? 0 : 0.7;
  lights.ambient.intensity = studio ? 0.08 : 0.1;
  lights.key.intensity = studio ? 0.9 : 1.05;
  lights.fill.intensity = studio ? 0.38 : 0;
  lights.rim.intensity = studio ? 0.55 : 0;
  lights.key.color.set(studio ? 0xffe2c4 : 0xfff1cf);
}

export function setup(canvas, params = {}) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = new Color(0x202632);
  const camera = new PerspectiveCamera({
    fov: 44,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(6, 4.5, 9);
  aimCamera(camera, new Vector3(0, 0.6, 0));
  const renderer = new Renderer({ canvas, width, height });

  const hemisphere = new HemisphereLight(0x9edcff, 0x44372f, 0.7);
  const ambient = new AmbientLight(0xffffff, 0.1);
  const key = new DirectionalLight(0xfff1cf, 1.05);
  key.position.set(4, 7, 4);
  const fill = new DirectionalLight(0x9ec9ff, 0);
  fill.position.set(-5, 3, 5);
  const rim = new DirectionalLight(0xb6c8ff, 0);
  rim.position.set(2, 4, -5);
  scene.add(hemisphere, ambient, key, fill, rim);
  const lights = { ambient, fill, hemisphere, key, rim };
  applyRig(lights, params.rig);

  const groundGeometry = new PlaneGeometry(14, 10);
  const groundMaterial = new LambertMaterial({ color: 0x747b84 });
  const ground = new Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;
  scene.add(ground);
  const material = new LambertMaterial({ color: 0xb8bec8 });
  const forms = [
    new Mesh(new SphereGeometry(1.05, 18, 12), material),
    new Mesh(new BoxGeometry(1.65, 1.65, 1.65), material),
    new Mesh(new CylinderGeometry(0.78, 0.78, 2, 18), material),
  ];
  forms[0].position.set(-2.3, 0.05, 0);
  forms[1].position.set(0, -0.15, 0);
  forms[2].position.set(2.3, 0, 0);
  scene.add(...forms);

  const swatches = [0x2f3338, 0x777d85, 0xc4c8ce, 0xb85b4b, 0x4f76a7];
  const swatchGeometry = new BoxGeometry(0.7, 0.22, 0.7);
  const swatchMaterials = swatches.map(
    (color) => new LambertMaterial({ color }),
  );
  swatchMaterials.forEach((swatchMaterial, index) => {
    const swatch = new Mesh(swatchGeometry, swatchMaterial);
    swatch.position.set(-1.4 + index * 0.7, -0.82, 2);
    scene.add(swatch);
  });

  const animation = createExampleAnimationLoop(() => {
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    update(nextParams) {
      applyRig(lights, nextParams.rig);
    },
    cleanup() {
      animation.cleanup();
      groundGeometry.dispose();
      groundMaterial.dispose();
      swatchGeometry.dispose();
      swatchMaterials.forEach((entry) => {
        entry.dispose();
      });
      forms.forEach((form) => {
        form.geometry.dispose();
      });
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const daylight = new EASEL.HemisphereLight(0x9edcff, 0x44372f, 0.7);
const key = new EASEL.DirectionalLight(0xfff1cf, 1.05);
const fill = new EASEL.DirectionalLight(0x9ec9ff, 0);
const rim = new EASEL.DirectionalLight(0xb6c8ff, 0);
scene.add(daylight, key, fill, rim);`;
export const example = { meta, controls, setup, easelSource };
