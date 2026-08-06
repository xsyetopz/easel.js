import {
  CatmullRomCurve3,
  Geometry,
  LambertMaterial,
  Line,
  LineMaterial,
  Mesh,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from "@/index.js";
import { createScene, runLoop } from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_modifier_curve",
  name: "Curve Modifier",
  category: "canvas",
  description:
    "A bounded Catmull–Rom path drives authored tube geometry and an animated marker; the unavailable WebGL modifier is replaced with CPU curve sampling.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [5, 4, 9],
    target: [0, 0.5, 0],
  });
  const curve = new CatmullRomCurve3([
    new Vector3(-3, 0, -2),
    new Vector3(-1, 1.7, 0),
    new Vector3(1, -0.3, 1.8),
    new Vector3(3, 1.2, -1),
  ]);
  const tube = new Mesh(
    new TubeGeometry(curve, 36, 0.14, 8),
    new LambertMaterial({ color: 0x5eace1 }),
  );
  scene.add(tube);
  const linePositions = [];
  for (const point of curve.getPoints(48)) {
    linePositions.push(point.x, point.y, point.z ?? 0);
  }
  const guide = new Line(
    new Geometry().setPositions(linePositions),
    new LineMaterial({ color: 0xf2cf62, linewidth: 1 }),
  );
  scene.add(guide);
  const marker = new Mesh(
    new SphereGeometry(0.28, 10, 6),
    new LambertMaterial({ color: 0xffe16b }),
  );
  scene.add(marker);

  return runLoop(renderer, scene, camera, (time) => {
    const u = (time * 0.13) % 1;
    const point = curve.getPointAt(u, new Vector3());
    marker.position.copy(point);
    marker.rotation.y = time * 2;
  });
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const curve = new EASEL.CatmullRomCurve3(controlPoints);
const tube = new EASEL.TubeGeometry(curve, 36, 0.14, 8);
marker.position.copy(curve.getPointAt(progress));`;

export const threeSource = `import * as THREE from "three";

const curve = new THREE.CatmullRomCurve3(controlPoints);
const tube = new THREE.TubeGeometry(curve, 36, 0.14, 8);
marker.position.copy(curve.getPointAt(progress));`;

export const example = { meta, controls, setup, easelSource, threeSource };
