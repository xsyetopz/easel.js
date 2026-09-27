// EASEL 0.8.0: Timer.update(timestamp) then the `delta` accessor (seconds).
import { Timer } from "@xsyetopz/easel";

export function deltas(stamps: number[]): number[] {
  const timer = new Timer();
  return stamps.map((t) => timer.update(t).delta);
}
