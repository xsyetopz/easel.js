// EASEL 0.7.0: EllipseCurve interpolates start..end with no normalization,
// and `clockwise` walks the same span from end back to start. Compute
// three.js's signed sweep once and pass a counter-clockwise span.
import { Path } from "@xsyetopz/easel";

export function threeSweep(
  start: number,
  end: number,
  clockwise: boolean,
): number {
  const twoPi = Math.PI * 2;
  let delta = end - start;
  const samePoints = Math.abs(delta) < Number.EPSILON;
  while (delta < 0) delta += twoPi;
  while (delta > twoPi) delta -= twoPi;
  if (delta < Number.EPSILON) delta = samePoints ? 0 : twoPi;
  if (clockwise && !samePoints) delta = delta === twoPi ? -twoPi : delta - twoPi;
  return delta;
}

export function points(start: number, end: number, clockwise: boolean) {
  const sweep = threeSweep(start, end, clockwise);
  const arc = new Path().absarc(0, 0, 1, start, start + sweep, false);
  return [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
    const p = arc.getPoint(i / 8);
    return [p?.x ?? NaN, p?.y ?? NaN];
  });
}
