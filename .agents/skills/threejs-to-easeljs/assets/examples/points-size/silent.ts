// Naive port that type-checks: three.js world-unit size copied verbatim.
import { PointsMaterial } from "@xsyetopz/easel";

export function dust(): PointsMaterial {
  return new PointsMaterial({ color: 0xffffff, size: 0.05 });
}
