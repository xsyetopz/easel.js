import { Interpolant } from "./Interpolant.ts";

/** Cubic Bezier interpolation with tangent control points. */
export class BezierInterpolant extends Interpolant {
  #inTangents: ArrayLike<number>;
  #outTangents: ArrayLike<number>;

  /** Creates a Bezier interpolant from keyframes and tangent arrays. */
  constructor(
    positions: ArrayLike<number>,
    values: ArrayLike<number>,
    stride: number,
    inTangents: ArrayLike<number>,
    outTangents: ArrayLike<number>,
    result?: number[],
  ) {
    super(positions, values, stride, result);
    this.#inTangents = inTangents;
    this.#outTangents = outTangents;
  }

  /** Interpolates the interval beginning at `i1` using cubic Bezier. */
  override interpolate_(i1: number, t0: number, t: number, t1: number): number[] {
    const stride = this.stride;
    const values = this.values;
    const result = this.result;
    const inTangents = this.#inTangents;
    const outTangents = this.#outTangents;
    const tangentStride = stride * 2;
    for (let c = 0; c < stride; c++) {
      const value0 = values[i1 * stride + c];
      const value1 = values[(i1 + 1) * stride + c];
      const outOffset = i1 * tangentStride + c * 2;
      const inOffset = (i1 + 1) * tangentStride + c * 2;
      const control0Time = outTangents[outOffset]!;
      const control0Value = outTangents[outOffset + 1]!;
      const control1Time = inTangents[inOffset]!;
      const control1Value = inTangents[inOffset + 1]!;
      let parameter = (t - t0) / (t1 - t0);
      for (let iteration = 0; iteration < 8; iteration++) {
        const oneMinus = 1 - parameter;
        const parameter2 = parameter * parameter;
        const curveTime =
          oneMinus * oneMinus * oneMinus * t0 +
          3 * oneMinus * oneMinus * parameter * control0Time +
          3 * oneMinus * parameter2 * control1Time +
          parameter2 * parameter * t1;
        const error = curveTime - t;
        if (Math.abs(error) < 1e-10) break;
        const derivative =
          3 * oneMinus * oneMinus * (control0Time - t0) +
          6 * oneMinus * parameter * (control1Time - control0Time) +
          3 * parameter2 * (t1 - control1Time);
        if (Math.abs(derivative) < 1e-10) break;
        parameter = Math.max(
          0,
          Math.min(1, parameter - error / derivative),
        );
      }
      const oneMinus = 1 - parameter;
      const parameter2 = parameter * parameter;
      result[c] =
        oneMinus * oneMinus * oneMinus * value0 +
        3 * oneMinus * oneMinus * parameter * control0Value +
        3 * oneMinus * parameter2 * control1Value +
        parameter2 * parameter * value1;
    }
    return result;
  }
}
