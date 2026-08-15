import { Interpolant } from "./Interpolant.ts";

/** Catmull-Rom / cubic spline interpolation between adjacent keyframes. */
export class CubicInterpolant extends Interpolant {
  /** Interpolates the interval beginning at `i1` using cubic spline. */
  override interpolate_(
    i1: number,
    t0: number,
    t: number,
    t1: number,
  ): number[] {
    const stride = this.stride;
    const values = this.values;
    const result = this.result;
    const previous = this.smoothPrevious(i1, t0, t1);
    const next = this.smoothNext(i1, t0, t1);
    const halfDelta = (t1 - t0) * 0.5;
    const weightPrevious = halfDelta / (t0 - previous.time);
    const weightNext = halfDelta / (next.time - t1);
    const p = (t - t0) / (t1 - t0);
    const p2 = p * p;
    const p3 = p2 * p;
    const sPrevious =
      -weightPrevious * p3 + 2 * weightPrevious * p2 - weightPrevious * p;
    const s0 =
      (1 + weightPrevious) * p3 +
      (-1.5 - 2 * weightPrevious) * p2 +
      (-0.5 + weightPrevious) * p +
      1;
    const s1 = (-1 - weightNext) * p3 + (1.5 + weightNext) * p2 + 0.5 * p;
    const sNext = weightNext * p3 - weightNext * p2;
    for (let c = 0; c < stride; c++) {
      result[c] =
        sPrevious * values[previous.index * stride + c] +
        s0 * values[i1 * stride + c] +
        s1 * values[(i1 + 1) * stride + c] +
        sNext * values[next.index * stride + c];
    }
    return result;
  }
}
