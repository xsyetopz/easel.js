// three.js r186: renderOrder on the object; an overlay also disables the
// depth test. Sorting happens inside WebGLRenderer: type-checked only.
import * as THREE from "three";

export function scene() {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  wall.position.z = 1;
  const marker = new THREE.Mesh(new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({ color: 0x0000ff, depthTest: false }));
  marker.renderOrder = 1;
  const underlay = new THREE.Mesh(new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false }));
  underlay.renderOrder = -1;
  return { wall, marker, underlay };
}
