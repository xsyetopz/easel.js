import { Interpolant } from "./Interpolant.ts";

/** Linear interpolation between adjacent keyframes. */
export class LinearInterpolant extends Interpolant {
  /** Interpolates the interval beginning at `i1` using linear blend. */
  override interpolate_(i1: number, t0: number, t: number, t1: number): number[] {
    const stride = this.stride;
    const values = this.values;
    const result = this.result;
    const alpha = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    const base0 = i1 * stride;
    const base1 = base0 + stride;
    for (let c = 0; c < stride; c++) {
      result[c] = values[base0 + c] + alpha * (values[base1 + c] - values[base0 + c]);
    }
    return result;
  }
}
