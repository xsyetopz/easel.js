import { slerpQuaternionsFlat } from "../../math/Quaternion.ts";
import { Interpolant } from "./Interpolant.ts";

/** Spherical linear interpolation for quaternion keyframes. */
export class QuaternionLinearInterpolant extends Interpolant {
  /** Interpolates the interval beginning at `i1` using SLERP. */
  override interpolate_(i1: number, t0: number, t: number, t1: number): number[] {
    const values = this.values;
    const result = this.result;
    if (t1 === t0) {
      const base = i1 * 4;
      for (let c = 0; c < 4; c++) result[c] = values[base + c];
      return result;
    }
    const alpha = (t - t0) / (t1 - t0);
    const base0 = i1 * 4;
    const base1 = (i1 + 1) * 4;
    slerpQuaternionsFlat(result, 0, values, base0, values, base1, alpha);
    return result;
  }
}
