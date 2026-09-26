// three.js r186: Clock is deprecated since r183; Timer.getDelta() in ms/1000.
import * as THREE from "three";

export function deltas(stamps) {
  const timer = new THREE.Timer();
  return stamps.map((t) => timer.update(t).getDelta());
}
