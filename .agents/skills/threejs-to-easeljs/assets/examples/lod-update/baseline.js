// three.js r186: LOD.autoUpdate is true, so WebGLRenderer.render calls
// lod.update(camera) itself. This baseline makes that call explicitly
// because it runs without WebGL.
import * as THREE from "three";

export function visibleLevels(distance) {
  const lod = new THREE.LOD();
  lod.addLevel(new THREE.Object3D(), 0);
  lod.addLevel(new THREE.Object3D(), 10);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, distance);
  camera.updateMatrixWorld();
  lod.updateMatrixWorld();
  if (lod.autoUpdate) lod.update(camera);
  return lod.levels.map((level) => level.object.visible);
}
