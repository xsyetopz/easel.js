import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "lighting-bench",
  name: "Lighting Bench",
  category: "materials",
  animated: true,
  description:
    "Compare a controlled daylight rig against a neutral studio setup.",
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

function applyRig(scene, ground, lights, rig) {
  const daylight = rig !== "studio";
  scene.background = new Color(daylight ? 0x8fc7eb : 0x1b2230);
  lights.hemisphere.intensity = daylight ? 1.05 : 0;
  lights.ambient.intensity = daylight ? 0.12 : 0.72;
  lights.sun.intensity = daylight ? 0.55 : 0.28;
  lights.fill.intensity = daylight ? 0 : 0.45;
  lights.sun.color.set(daylight ? 0xfff5d6 : 0xffffff);
  lights.fill.color.set(0x9ec9ff);
  ground.material.color.set(daylight ? 0x6b925a : 0x4e5663);
}

export function setup(canvas, params = {}) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(5, 4, 8);
  camera.lookAt(new Vector3(0, 1, 0));
  const renderer = new Renderer({ canvas, width, height });

  const hemisphere = new HemisphereLight(0x9edcff, 0x493c37, 1.05);
  const ambient = new AmbientLight(0xffffff, 0.12);
  const sun = new DirectionalLight(0xfff5d6, 0.55);
  sun.position.set(4, 7, 3);
  const fill = new DirectionalLight(0x9ec9ff, 0);
  fill.position.set(-4, 4, 6);
  scene.add(hemisphere, ambient, sun, fill);

  const ground = new Mesh(
    new PlaneGeometry(14, 14),
    new LambertMaterial({ color: 0x6b925a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;
  scene.add(ground);
  applyRig(scene, ground, { ambient, fill, hemisphere, sun }, params.rig);

  const props = [
    [new SphereGeometry(1.05, 18, 12), 0xe86d59, -2.1],
    [new BoxGeometry(1.6, 1.6, 1.6), 0x5b9cd4, 0.2],
    [new SphereGeometry(0.85, 16, 10), 0xf3c65d, 2.3],
  ].map(([geometry, color, x]) => {
    const mesh = new Mesh(geometry, new LambertMaterial({ color }));
    mesh.position.set(x, 0, 0);
    scene.add(mesh);
    return mesh;
  });
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    clock.update(timestamp);
    props.forEach((mesh, index) => {
      mesh.rotation.y += clock.delta * (0.22 + index * 0.08);
      mesh.position.y = Math.sin(clock.elapsedTime * 0.8 + index) * 0.08;
    });
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    update(nextParams) {
      applyRig(
        scene,
        ground,
        { ambient, fill, hemisphere, sun },
        nextParams.rig,
      );
    },
    cleanup() {
      animation.cleanup();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const studio = params.rig === "studio";
scene.background = new EASEL.Color(studio ? 0x1b2230 : 0x8fc7eb);
scene.add(new EASEL.HemisphereLight(0x9edcff, 0x493c37, studio ? 0 : 1.05));
scene.add(new EASEL.AmbientLight(0xffffff, studio ? 0.72 : 0.12));
const key = new EASEL.DirectionalLight(studio ? 0xffffff : 0xfff5d6, studio ? 0.28 : 0.55);
const fill = new EASEL.DirectionalLight(0x9ec9ff, studio ? 0.45 : 0);
scene.add(key, fill);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
