import type { Frustum } from "../math/Frustum.ts";
import type { Matrix4 } from "../math/Matrix4.ts";
import type { Vector3 } from "../math/Vector3.ts";
import type { GeometryLike } from "./_SceneTraversalShared.ts";
import { _bsCenter } from "./_SceneTraversalShared.ts";

/** Mutable bounding-sphere data reused during scene traversal. */
export interface BoundingSphereState {
  /** World-space bounding-sphere center on the x axis. */
  centerX: number;
  /** World-space bounding-sphere center on the y axis. */
  centerY: number;
  /** World-space bounding-sphere center on the z axis. */
  centerZ: number;
  /** Bounding-sphere radius after applying the node's world scale. */
  worldRadius: number;
}

/** Tests a node bounding sphere against the frustum and records its world-space bounds. */
export function isFrustumCulled(
  node: { geometry: GeometryLike; matrixWorld: Matrix4 },
  frustum: Frustum,
  sphereScratch: { centre: Vector3; radius: number },
  state: BoundingSphereState,
): boolean {
  const bs = node.geometry.boundingSphere;
  if (!bs) {
    const me = node.matrixWorld.elements;
    state.centerX = me[12];
    state.centerY = me[13];
    state.centerZ = me[14];
    state.worldRadius = 0;
    return false;
  }

  const me = node.matrixWorld.elements;
  const bsCenter = bs.centre;
  if (bsCenter.x === 0 && bsCenter.y === 0 && bsCenter.z === 0) {
    _bsCenter.x = me[12];
    _bsCenter.y = me[13];
    _bsCenter.z = me[14];
  } else {
    _bsCenter.copy(bsCenter).applyMatrix4(node.matrixWorld);
  }
  const sx2 = me[0] * me[0] + me[1] * me[1] + me[2] * me[2];
  const sy2 = me[4] * me[4] + me[5] * me[5] + me[6] * me[6];
  const sz2 = me[8] * me[8] + me[9] * me[9] + me[10] * me[10];
  const worldRadius = bs.radius * Math.sqrt(Math.max(sx2, sy2, sz2));

  state.centerX = _bsCenter.x;
  state.centerY = _bsCenter.y;
  state.centerZ = _bsCenter.z;
  state.worldRadius = worldRadius;

  sphereScratch.radius = worldRadius;
  sphereScratch.centre = _bsCenter;
  return !frustum.intersectsSphere(sphereScratch);
}
