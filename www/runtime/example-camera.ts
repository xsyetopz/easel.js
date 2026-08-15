/**
 * Aim a camera after its position has been assigned.
 *
 * Node.lookAt reads matrixWorld. Setup code usually sets position immediately
 * before lookAt, so prepare that matrix first and commit the new rotation.
 */
export function aimCamera(camera: Camera, target: Vector3): Camera {
  camera.updateMatrixWorld(false, false, true);
  camera.lookAt(target);
  camera.updateMatrix();
  return camera;
}
import type { Camera } from "../../src/cameras/Camera.ts";
import type { Vector3 } from "../../src/math/Vector3.ts";
