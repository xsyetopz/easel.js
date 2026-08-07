import { Interpolant } from "./Interpolant.ts";

/** Discrete interpolation that copies the value at the current keyframe. */
export class DiscreteInterpolant extends Interpolant {
  /** Copies the value at index `i1` into the result buffer. */
  override interpolate_(i1: number): number[] {
    this.copyValue(i1);
    return this.result;
  }
}
