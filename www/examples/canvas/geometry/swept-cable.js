import {
  AmbientLight,
  CatmullRomCurve3,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Shape,
  Timer,
  TubeGeometry,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "swept-cable",
  name: "Swept Cable",
  category: "geometry",
  animated: true,
  description: "Turn a path into a swept cable, rail, or road section.",
};

export const controls = [];

function makeBadge() {
  const shape = new Shape();
  shape.moveTo(-1.45, -0.8);
  shape.lineTo(1.2, -0.8);
  shape.quadraticCurveTo(1.55, -0.8, 1.55, -0.45);
  shape.lineTo(1.55, 0.65);
  shape.quadraticCurveTo(1.55, 0.95, 1.2, 0.95);
  shape.lineTo(-1.2, 0.95);
  shape.quadraticCurveTo(-1.55, 0.95, -1.55, 0.65);
  shape.lineTo(-1.55, -0.45);
  shape.quadraticCurveTo(-1.55, -0.8, -1.45, -0.8);
  shape.lineTo(-1.45, -0.8);
  return new ExtrudeGeometry(shape, { depth: 0.5, steps: 3 });
}

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x111a28;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 2.4, 8.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 6, 7);
  scene.add(light);
  const group = new Group();
  scene.add(group);
  const badge = new Mesh(makeBadge(), new LambertMaterial({ color: 0xe7a85e }));
  badge.position.set(-1.4, 0.3, 0);
  badge.rotation.x = -0.35;
  group.add(badge);
  const path = new CatmullRomCurve3([
    new Vector3(-2.1, -0.7, 0.2),
    new Vector3(-0.7, 1.1, 0),
    new Vector3(0.7, -0.2, 0.2),
    new Vector3(2.1, 0.9, -0.1),
  ]);
  const ribbon = new Mesh(
    new TubeGeometry(path, 28, 0.16, 8),
    new LambertMaterial({ color: 0x5cb7dc }),
  );
  ribbon.position.y = -0.8;
  group.add(ribbon);
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    group.rotation.y += clock.update().delta * 0.24;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const plate = new EASEL.ExtrudeGeometry(shape, { depth: 0.5, steps: 3 });
const ribbon = new EASEL.TubeGeometry(new EASEL.CatmullRomCurve3(points), 28, 0.16, 8);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
