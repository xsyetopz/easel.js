import { InterpolationEnding, type InterpolationEndingMode } from "../Track.ts";

/** Endpoint result for cubic spline boundary evaluation. */
interface Endpoint {
  /** Value-array index for the endpoint keyframe. */
  index: number;
  /** Time associated with the endpoint keyframe. */
  time: number;
}

/** Base keyframe interpolant with binary search and endpoint helpers. */
export class Interpolant {
  #positions: ArrayLike<number>;
  #values: ArrayLike<number>;
  #stride: number;
  #result: number[];
  #endingStart: InterpolationEndingMode = InterpolationEnding.ZeroSlope;
  #endingEnd: InterpolationEndingMode = InterpolationEnding.ZeroSlope;

  /** Keyframe times in strictly increasing order. */
  get positions(): ArrayLike<number> {
    return this.#positions;
  }

  /** Flattened keyframe values grouped by {@link stride}. */
  get values(): ArrayLike<number> {
    return this.#values;
  }

  /** Number of scalar values stored for each keyframe. */
  get stride(): number {
    return this.#stride;
  }

  /** Reusable result buffer filled by {@link evaluate}. */
  get result(): number[] {
    return this.#result;
  }

  /** Smooth-interpolation endpoint policy before the first keyframe. */
  get endingStart(): InterpolationEndingMode {
    return this.#endingStart;
  }

  /** Smooth-interpolation endpoint policy after the last keyframe. */
  get endingEnd(): InterpolationEndingMode {
    return this.#endingEnd;
  }

  /** Creates an interpolant from keyframe times, values, and stride. */
  constructor(
    positions: ArrayLike<number>,
    values: ArrayLike<number>,
    stride: number,
    result?: number[],
  ) {
    this.#positions = positions;
    this.#values = values;
    this.#stride = stride;
    this.#result = result ?? new Array(stride).fill(0);
  }

  /** Sets endpoint policies for cubic spline interpolation. */
  setEndings(start: InterpolationEndingMode, end: InterpolationEndingMode): void {
    this.#endingStart = start;
    this.#endingEnd = end;
  }

  /** Samples interpolated values at `time` seconds using binary search. */
  evaluate(time: number): number[] {
    const positions = this.#positions;
    const count = positions.length;
    if (count === 0) {
      this.#result.fill(0);
      return this.#result;
    }
    if (count === 1 || time <= positions[0]) {
      this.copyValue(0);
      return this.#result;
    }
    if (time >= positions[count - 1]) {
      this.copyValue(count - 1);
      return this.#result;
    }
    const index = this.findKeyframe(time);
    return this.interpolate_(
      index,
      positions[index]!,
      time,
      positions[index + 1]!,
    );
  }

  /** Overridden by subclasses to interpolate the interval beginning at `i1`. */
  interpolate_(_i1: number, _t0: number, _t: number, _t1: number): number[] {
    throw new Error("Interpolant.interpolate_ must be overridden");
  }

  /** Copies the value at `index` into the result buffer. */
  protected copyValue(index: number): void {
    const base = index * this.#stride;
    for (let c = 0; c < this.#stride; c++) {
      this.#result[c] = this.#values[base + c];
    }
  }

  /** Binary search for the keyframe index at `time`. */
  protected findKeyframe(time: number): number {
    const positions = this.#positions;
    let low = 0;
    let high = positions.length - 1;
    while (low < high - 1) {
      const middle = (low + high) >> 1;
      if (positions[middle]! <= time) low = middle;
      else high = middle;
    }
    return low;
  }

  /** Returns the previous endpoint for cubic spline interpolation. */
  protected smoothPrevious(index: number, t0: number, t1: number): Endpoint {
    const positions = this.#positions;
    if (index > 0) return { index: index - 1, time: positions[index - 1]! };
    if (this.#endingStart === InterpolationEnding.ZeroSlope) {
      return { index: index + 1, time: 2 * t0 - t1 };
    }
    if (
      this.#endingStart === InterpolationEnding.WrapAround &&
      positions.length > 2
    ) {
      const previous = positions.length - 2;
      return {
        index: previous,
        time: t0 + positions[previous]! - positions[previous + 1]!,
      };
    }
    return { index: index + 1, time: t1 };
  }

  /** Returns the next endpoint for cubic spline interpolation. */
  protected smoothNext(index: number, t0: number, t1: number): Endpoint {
    const positions = this.#positions;
    const next = index + 2;
    if (next < positions.length)
      return { index: next, time: positions[next]! };
    if (this.#endingEnd === InterpolationEnding.ZeroSlope) {
      return { index: index + 1, time: 2 * t1 - t0 };
    }
    if (
      this.#endingEnd === InterpolationEnding.WrapAround &&
      positions.length > 2
    ) {
      return { index: 1, time: t1 + positions[1]! - positions[0]! };
    }
    return { index, time: t0 };
  }
}
