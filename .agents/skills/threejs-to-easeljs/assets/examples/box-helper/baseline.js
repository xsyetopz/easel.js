// three.js r186: BoxHelper(object) builds a world-space box at
// construction; call update() again when the object moves.
import * as THREE from "three";

export function extentX() {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  mesh.position.x = 5;
  mesh.updateMatrixWorld();
  const helper = new THREE.BoxHelper(mesh, 0xffff00);
  const xs = Array.from(helper.geometry.attributes.position.array)
    .filter((_, i) => i % 3 === 0);
  return [Math.min(...xs), Math.max(...xs)];
}
