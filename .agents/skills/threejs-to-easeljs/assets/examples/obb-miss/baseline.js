// three.js r186 add-on: OBB.intersectRay returns null on a miss.
import * as THREE from "three";
import { OBB } from "three/addons/math/OBB.js";

export function hitPoint(origin) {
  const box = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
  const ray = new THREE.Ray(new THREE.Vector3(...origin),
    new THREE.Vector3(0, 0, -1));
  const hit = box.intersectRay(ray, new THREE.Vector3());
  return hit !== null ? hit.toArray() : "miss";
}
