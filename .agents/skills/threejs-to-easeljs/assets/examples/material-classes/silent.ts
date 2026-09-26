// Naive port that type-checks: relies on three's vertexColors default.
import { BasicMaterial, PointsMaterial } from "@xsyetopz/easel";

export function basic(): BasicMaterial {
  return new BasicMaterial({ color: 0xffffff });
}

export function points(): PointsMaterial {
  return new PointsMaterial({ color: 0xffffff, size: 2 });
}
