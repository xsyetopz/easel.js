import {
  AmbientLight,
  CatmullRomCurve3,
  DirectionalLight,
  Geometry,
  Group,
  LambertMaterial,
  Line,
  LineMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  TubeGeometry,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "curve-editor",
  name: "Curve Editor",
  category: "geometry",
  animated: true,
  description: "Move path control points and preview the resulting curve.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x101824;
  const camera = new PerspectiveCamera({
    fov: 44,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1.8, 8.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 5, 6);
  scene.add(light);
  const points = [
    new Vector3(-2.6, -0.6, 0),
    new Vector3(-1.2, 1.1, 0.1),
    new Vector3(0.1, -0.4, 0),
    new Vector3(1.3, 1.2, -0.1),
    new Vector3(2.6, 0, 0),
  ];
  const path = new CatmullRomCurve3(points);
  const tube = new Mesh(
    new TubeGeometry(path, 36, 0.2, 8),
    new LambertMaterial({ color: 0x59b6df }),
  );
  const controlGeometry = new Geometry();
  controlGeometry.setPositions(
    points.flatMap((point) => [point.x, point.y, point.z]),
  );
  const controlLine = new Line(
    controlGeometry,
    new LineMaterial({ color: 0xf1bd67, linewidth: 2 }),
  );
  controlLine.position.z = 0.2;
  const root = new Group();
  root.add(tube);
  root.add(controlLine);
  scene.add(root);

  let selected = 0;
  function rebuild() {
    const previous = tube.geometry;
    path.points = points;
    tube.geometry = new TubeGeometry(path, 36, 0.2, 8);
    previous?.dispose();
    controlGeometry.setPositions(
      points.flatMap((point) => [point.x, point.y, point.z]),
    );
  }
  const handleClick = (event) => {
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    const point = points[selected];
    point.x = x * 2.8;
    point.y = y * 2.1;
    selected = (selected + 1) % points.length;
    rebuild();
  };
  canvas.addEventListener("click", handleClick);
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    root.rotation.y += clock.update().delta * 0.18;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      canvas.removeEventListener("click", handleClick);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
points[selected].set(pointer.x, pointer.y, 0);
path.points = points;
tube.geometry = new EASEL.TubeGeometry(path, 36, 0.2, 8);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
