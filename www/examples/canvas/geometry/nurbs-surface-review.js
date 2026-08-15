import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  NURBSCurve,
  NURBSSurface,
  ParametricGeometry,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  TubeGeometry,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "nurbs-surface-review",
  name: "NURBS Surface Review",
  category: "geometry",
  animated: true,
  description: "A smooth control-point surface represents a modeling form.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x111827;
  const camera = new PerspectiveCamera({
    fov: 43,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 2.2, 8.4);
  camera.updateMatrixWorld(false, false, true);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrix();
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.95);
  light.position.set(3, 6, 7);
  scene.add(light);

  const degree = 3;
  const knots = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1];
  const controlPoints = [
    { x: -2.6, y: -0.7, z: 0, w: 1 },
    { x: -2, y: 0.8, z: 0.3, w: 1 },
    { x: -1, y: -0.1, z: -0.2, w: 1 },
    { x: 0, y: 1.1, z: 0.1, w: 1 },
    { x: 1, y: -0.6, z: 0.2, w: 1 },
    { x: 2, y: 0.9, z: -0.1, w: 1 },
    { x: 2.6, y: 0.1, z: 0, w: 1 },
  ];
  const curve = new NURBSCurve(degree, knots, controlPoints);
  const mesh = new Mesh(
    new TubeGeometry(curve, 42, 0.22, 12),
    new LambertMaterial({ color: 0xb97bea }),
  );
  scene.add(mesh);

  const surface = new NURBSSurface(
    2,
    2,
    [0, 0, 0, 1, 1, 1],
    [0, 0, 0, 1, 1, 1],
    [
      [
        { x: -1.8, y: -1.4, z: 0.2, w: 1 },
        { x: -1.8, y: 0, z: -0.6, w: 1 },
        { x: -1.8, y: 1.4, z: 0.2, w: 1 },
      ],
      [
        { x: 0, y: -1.4, z: -0.6, w: 1 },
        { x: 0, y: 0, z: 0.9, w: 1 },
        { x: 0, y: 1.4, z: -0.6, w: 1 },
      ],
      [
        { x: 1.8, y: -1.4, z: 0.2, w: 1 },
        { x: 1.8, y: 0, z: -0.6, w: 1 },
        { x: 1.8, y: 1.4, z: 0.2, w: 1 },
      ],
    ],
  );
  const surfaceMesh = new Mesh(
    new ParametricGeometry(
      (u, v, target) => surface.getPoint(u, v, target),
      18,
      18,
    ),
    new LambertMaterial({ color: 0x46b4a8 }),
  );
  surfaceMesh.position.set(0, -1.55, -0.55);
  surfaceMesh.scale.setScalar(0.55);
  scene.add(surfaceMesh);

  const clock = new Timer();
  const animation = createExampleAnimationLoop((_timestamp) => {
    mesh.rotation.y += clock.update().delta * 0.3;
    surfaceMesh.rotation.y -= clock.delta * 0.15;
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
const curve = new EASEL.NURBSCurve(degree, knots, controlPoints);
const geometry = new EASEL.TubeGeometry(curve, 42, 0.22, 12);
const surface = new EASEL.NURBSSurface(degree1, degree2, knots1, knots2, surfaceControlPoints);
const surfaceGeometry = new EASEL.ParametricGeometry((u, v, target) => surface.getPoint(u, v, target), 18, 18);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
