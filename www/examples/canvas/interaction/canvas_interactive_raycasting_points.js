import { Geometry, Points, PointsMaterial, Raycaster } from "@/index.js";
import {
  createScene,
  pointerNdc,
  runLoop,
} from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_interactive_raycasting_points",
  name: "Interactive Raycast Points",
  category: "canvas",
  description:
    "A CPU point cloud highlights the nearest vertex under the pointer using Raycaster.pointsThreshold and Geometry colors.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [0, 0.5, 9],
    target: [0, 0, 0],
  });
  const count = 260;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    const angle = index * 0.41;
    const radius = 0.18 + (index / count) * 3.9;
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = Math.sin(angle * 1.13) * radius * 0.55;
    positions[offset + 2] = Math.sin(angle) * 0.45;
    colors[offset] = 0.25 + (index % 5) * 0.09;
    colors[offset + 1] = 0.55 + (index % 3) * 0.12;
    colors[offset + 2] = 0.9;
  }
  const geometry = new Geometry().setPositions(positions).setColors(colors);
  const points = new Points(
    geometry,
    new PointsMaterial({ color: 0xffffff, size: 4 }),
  );
  scene.add(points);
  const raycaster = new Raycaster();
  raycaster.pointsThreshold = 0.14;
  let pointer = { x: 0, y: 0 };
  let selected = -1;
  const removePointer = pointerNdc(canvas, (next) => {
    pointer = next;
  });
  const colorAttribute = geometry.getAttribute("color");

  return runLoop(
    renderer,
    scene,
    camera,
    (time) => {
      points.rotation.z = time * 0.08;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(points, false)[0];
      const nextSelected = hit?.index ?? -1;
      if (nextSelected !== selected) {
        if (selected >= 0) {
          const offset = selected * 3;
          colorAttribute.setXYZ(
            offset / 3,
            colors[offset],
            colors[offset + 1],
            colors[offset + 2],
          );
        }
        selected = nextSelected;
        if (selected >= 0) {
          colorAttribute.setXYZ(selected, 1, 0.86, 0.28);
        }
        colorAttribute.needsUpdate = true;
      }
    },
    [removePointer],
  );
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

raycaster.pointsThreshold = 0.14;
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObject(points, false)[0];
colors.setXYZ(hit.index, 1, 0.86, 0.28);`;

export const threeSource = `import * as THREE from "three";

raycaster.params.Points.threshold = 0.14;
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObject(points, false)[0];
colors.setXYZ(hit.index, 1, 0.86, 0.28);`;

export const example = { meta, controls, setup, easelSource, threeSource };
