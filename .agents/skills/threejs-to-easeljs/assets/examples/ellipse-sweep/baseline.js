// three.js r186: EllipseCurve normalizes the sweep to 0..2PI, then goes
// the other way round when clockwise. ArcCurve, Path.absarc and
// Path.absellipse all build an EllipseCurve.
import * as THREE from "three";

export function points(start, end, clockwise) {
  const arc = new THREE.Path().absarc(0, 0, 1, start, end, clockwise);
  return [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
    const p = arc.getPoint(i / 8);
    return [p.x, p.y];
  });
}
