// Naive port that type-checks: three.js's arguments copied verbatim.
import { Path } from "@xsyetopz/easel";

export function points(start: number, end: number, clockwise: boolean) {
  const arc = new Path().absarc(0, 0, 1, start, end, clockwise);
  return [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
    const p = arc.getPoint(i / 8);
    return [p?.x ?? NaN, p?.y ?? NaN];
  });
}
