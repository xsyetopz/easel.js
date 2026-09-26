// three.js r186 add-on: the controlled camera is `controls.object`.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function run() {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  const controls = new OrbitControls(camera, null);
  return controls.object === camera;
}
