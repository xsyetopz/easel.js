// three.js r186: updateMatrixWorld(force). With matrixAutoUpdate off, the
// caller writes `matrix` directly and forces the world update.
import * as THREE from "three";

export function run() {
  const parent = new THREE.Object3D();
  const child = new THREE.Object3D();
  parent.add(child);
  child.matrixAutoUpdate = false;
  parent.updateMatrixWorld();
  child.matrix.makeTranslation(5, 0, 0);
  parent.updateMatrixWorld(true);
  return child.matrixWorld.elements[12];
}
