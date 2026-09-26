/** World-space sprite quad frame shared by picking and rasterization. */
export interface SpriteQuadFrame {
  /** Scaled world-space quad X axis on the x axis; its length is the sprite's world X scale. */
  rightX: number;
  /** Scaled world-space quad X axis on the y axis. */
  rightY: number;
  /** Scaled world-space quad X axis on the z axis. */
  rightZ: number;
  /** Scaled world-space quad Y axis on the x axis; its length is the sprite's world Y scale. */
  upX: number;
  /** Scaled world-space quad Y axis on the y axis. */
  upY: number;
  /** Scaled world-space quad Y axis on the z axis. */
  upZ: number;
}

/**
 * Writes the camera-facing quad axes of a sprite, matching the three.js sprite
 * vertex shader: the quad lies in the camera's right/up plane, is rotated by
 * `rotation` around the view axis, and is scaled by the world X/Y scale.
 * A quad corner at normalized `(u, v)` is
 * `position + right * (u - center.x) + up * (v - center.y)`.
 * The camera axes must be unit length.
 */
export function writeSpriteQuadFrame(
  out: SpriteQuadFrame,
  world: ArrayLike<number>,
  cameraRight: { x: number; y: number; z: number },
  cameraUp: { x: number; y: number; z: number },
  rotation: number,
): SpriteQuadFrame {
  const scaleX = Math.sqrt(
    world[0] * world[0] + world[1] * world[1] + world[2] * world[2],
  );
  const scaleY = Math.sqrt(
    world[4] * world[4] + world[5] * world[5] + world[6] * world[6],
  );
  const cos = rotation === 0 ? 1 : Math.cos(rotation);
  const sin = rotation === 0 ? 0 : Math.sin(rotation);
  out.rightX = (cos * cameraRight.x + sin * cameraUp.x) * scaleX;
  out.rightY = (cos * cameraRight.y + sin * cameraUp.y) * scaleX;
  out.rightZ = (cos * cameraRight.z + sin * cameraUp.z) * scaleX;
  out.upX = (cos * cameraUp.x - sin * cameraRight.x) * scaleY;
  out.upY = (cos * cameraUp.y - sin * cameraRight.y) * scaleY;
  out.upZ = (cos * cameraUp.z - sin * cameraRight.z) * scaleY;
  return out;
}

/** Reads a sprite material's view-axis rotation, treating absent or non-finite values as zero. */
export function spriteRotation(material: unknown): number {
  const rotation = (material as { rotation?: unknown } | undefined)?.rotation;
  return typeof rotation === "number" && Number.isFinite(rotation)
    ? rotation
    : 0;
}
