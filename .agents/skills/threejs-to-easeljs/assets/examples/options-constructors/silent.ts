// Naive port that type-checks: fov omitted because three's default was 50.
import { PerspectiveCamera } from "@xsyetopz/easel";

export function projection(): number[] {
  const camera = new PerspectiveCamera({ aspect: 1.5, near: 0.1, far: 100 });
  return camera.projectionMatrix.toArray();
}
