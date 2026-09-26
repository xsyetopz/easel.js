// three.js r186: positional constructor arguments.
import * as THREE from "three";

export function run() {
  const perspective = new THREE.PerspectiveCamera(50, 1.5, 0.1, 100);
  const ortho = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 50);
  const fog = new THREE.Fog(0x8899aa, 10, 80);
  return {
    perspective: perspective.projectionMatrix.toArray(),
    ortho: ortho.projectionMatrix.toArray(),
    fog: [fog.color.getHex(), fog.near, fog.far],
    defaultFov: new THREE.PerspectiveCamera().fov,
  };
}
