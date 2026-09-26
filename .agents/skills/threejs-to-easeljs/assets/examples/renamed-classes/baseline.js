// three.js r186: Object3D, BufferGeometry, BufferAttribute.
import * as THREE from "three";

export function build() {
  const pivot = new THREE.Object3D();
  pivot.position.set(1, 2, 3);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0]);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.position.set(0, 1, 0);
  pivot.add(mesh);
  pivot.updateMatrixWorld(true);
  const sphere = geometry.boundingSphere;
  return {
    world: mesh.getWorldPosition(new THREE.Vector3()).toArray(),
    centre: sphere.center.toArray(),
    radius: sphere.radius,
    positions: Array.from(positions),
  };
}
