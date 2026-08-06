import { Geometry, Line, LineMaterial, Vector3 } from "@/index.js";
import { createScene, runLoop } from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_modifier_simplifier",
  name: "Geometry Simplifier",
  category: "canvas",
  description:
    "Douglas–Peucker simplification runs on authored line data in JavaScript, replacing the unavailable WebGL modifier while preserving the source curve.",
};

export const controls = [];

function distanceToSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSquared = segment.lengthSq;
  const parameter =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, point.clone().sub(start).dot(segment) / lengthSquared),
        );
  return point.distanceTo(start.clone().add(segment.multiplyScalar(parameter)));
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let farthest = tolerance;
  let split = -1;
  const start = points[0];
  const end = points[points.length - 1];
  for (let index = 1; index < points.length - 1; index++) {
    const distance = distanceToSegment(points[index], start, end);
    if (distance > farthest) {
      farthest = distance;
      split = index;
    }
  }
  if (split < 0) return [start, end];
  const left = simplify(points.slice(0, split + 1), tolerance);
  const right = simplify(points.slice(split), tolerance);
  return left.slice(0, -1).concat(right);
}

function toGeometry(points) {
  const positions = [];
  for (const point of points) positions.push(point.x, point.y, point.z);
  return new Geometry().setPositions(positions);
}

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [0, 0.5, 9],
    target: [0, 0.5, 0],
  });
  const source = [];
  for (let index = 0; index <= 80; index++) {
    const x = (index / 80 - 0.5) * 7;
    const y =
      0.9 + Math.sin(index * 0.42) * 0.65 + Math.cos(index * 1.9) * 0.12;
    source.push(new Vector3(x, y, 0));
  }
  const reduced = simplify(source, 0.16);
  const originalLine = new Line(
    toGeometry(source),
    new LineMaterial({ color: 0x536b8e, linewidth: 1 }),
  );
  const simplifiedLine = new Line(
    toGeometry(reduced),
    new LineMaterial({ color: 0xffd166, linewidth: 3 }),
  );
  simplifiedLine.position.z = 0.02;
  scene.add(originalLine, simplifiedLine);

  return runLoop(renderer, scene, camera, (time) => {
    originalLine.rotation.z = Math.sin(time * 0.4) * 0.03;
    simplifiedLine.rotation.z = originalLine.rotation.z;
  });
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const simplified = simplify(sourcePoints, 0.16);
const line = new EASEL.Line(new EASEL.Geometry().setPositions(flatten(simplified)), material);`;

export const threeSource = `import * as THREE from "three";

const simplified = simplify(sourcePoints, 0.16);
const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(simplified), material);`;

export const example = { meta, controls, setup, easelSource, threeSource };
