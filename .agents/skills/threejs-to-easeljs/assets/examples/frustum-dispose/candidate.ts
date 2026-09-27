// EASEL 0.8.0: test the world-space bounding sphere against the frustum;
// dispose geometry and material explicitly and fire the event yourself.
import {
  BasicMaterial,
  BoxGeometry,
  Frustum,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Sphere,
} from "@xsyetopz/easel";

export function intersectsFrustum(mesh: Mesh, frustum: Frustum): boolean {
  const geometry = mesh.geometry;
  if (geometry === undefined) return false;
  if (geometry.boundingSphere === undefined) geometry.computeBoundingSphere();
  const local = geometry.boundingSphere;
  if (local === undefined) return false;
  const world = new Sphere(local.center.clone(), local.radius);
  world.applyMatrix4(mesh.matrixWorld);
  return frustum.intersectsSphere(world);
}

export function visible(xs: number[]): boolean[] {
  const camera = new PerspectiveCamera({ fov: 50, aspect: 1, near: 0.1,
    far: 100 });
  camera.position.set(0, 0, 10);
  camera.updateMatrixWorld(false, true, true);
  camera.updateViewMatrix(false, true, true);
  const frustum = new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(
      camera.projectionMatrix, camera.matrixWorldInverse));
  return xs.map((x) => {
    const mesh = new Mesh(new BoxGeometry(), new BasicMaterial());
    mesh.position.x = x;
    mesh.updateMatrixWorld(false, true, true);
    return intersectsFrustum(mesh, frustum);
  });
}

export function disposeMesh(mesh: Mesh): void {
  mesh.geometry?.dispose();
  mesh.material?.dispose();
  mesh.dispatchEvent({ type: "dispose" });
}

export function disposeEvents(): number {
  const mesh = new Mesh(new BoxGeometry(), new BasicMaterial());
  let events = 0;
  mesh.addEventListener("dispose", () => events++);
  disposeMesh(mesh);
  return events;
}
