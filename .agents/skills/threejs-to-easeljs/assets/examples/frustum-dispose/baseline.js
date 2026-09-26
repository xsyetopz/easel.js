// three.js r186: Mesh.intersectsFrustum and Object3D.dispose (both new).
import * as THREE from "three";

export function visible(xs) {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.updateMatrixWorld();
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix, camera.matrixWorldInverse));
  return xs.map((x) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    mesh.position.x = x;
    mesh.updateMatrixWorld();
    return mesh.intersectsFrustum(frustum);
  });
}

export function disposeEvents() {
  const mesh = new THREE.Mesh();
  let events = 0;
  mesh.addEventListener("dispose", () => events++);
  mesh.dispose();
  return events;
}
