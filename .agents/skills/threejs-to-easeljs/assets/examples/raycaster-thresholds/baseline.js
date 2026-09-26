// three.js r186: per-type thresholds under raycaster.params.
import * as THREE from "three";

export function hits(threshold) {
  const points = new THREE.Points(new THREE.BufferGeometry().setFromPoints(
    [new THREE.Vector3(0.5, 0, 0)]), new THREE.PointsMaterial());
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
    [new THREE.Vector3(0.5, -1, 0), new THREE.Vector3(0.5, 1, 0)]));
  points.updateMatrixWorld();
  line.updateMatrixWorld();
  const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 5),
    new THREE.Vector3(0, 0, -1));
  raycaster.params.Points.threshold = threshold;
  raycaster.params.Line.threshold = threshold;
  return {
    points: raycaster.intersectObject(points).length,
    line: raycaster.intersectObject(line).length,
  };
}
