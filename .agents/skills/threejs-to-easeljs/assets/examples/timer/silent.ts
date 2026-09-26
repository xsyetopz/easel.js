// Naive port that type-checks: reads `delta` without calling update().
import { Timer } from "@xsyetopz/easel";

export function deltas(stamps: number[]): number[] {
  const timer = new Timer();
  return stamps.map(() => timer.delta);
}
