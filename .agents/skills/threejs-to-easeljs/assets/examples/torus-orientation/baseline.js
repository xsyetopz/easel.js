// three.js r186: the torus ring lies in the XY plane (hole along Z).
import * as THREE from "three";

export function torus() {
  return new THREE.TorusGeometry(1, 0.4, 12, 48);
}
