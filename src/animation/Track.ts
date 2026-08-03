/** Base keyframe track - stores a sequence of timed values and interpolates between them. */
export class Track {
  #name: string;
  #times: Float32Array;
  #values: Float32Array;
  #itemSize: number;

  constructor(
    name: string,
    times: Float32Array | number[],
    values: Float32Array | number[],
    itemSize = 1,
  ) {
    this.#name = name;
    this.#times =
      times instanceof Float32Array ? times : new Float32Array(times);
    this.#values =
      values instanceof Float32Array ? values : new Float32Array(values);
    this.#itemSize = itemSize;
  }

  get name(): string {
    return this.#name;
  }

  get times(): Float32Array {
    return this.#times;
  }

  get values(): Float32Array {
    return this.#values;
  }

  get itemSize(): number {
    return this.#itemSize;
  }

  /**
   * Linear interpolation between keyframes at index and index+1.
   * @param index Index of the keyframe just before time t
   * @param t0 Time of keyframe at index
   * @param t Current time
   * @param t1 Time of keyframe at index+1
   */
  interpolate(index: number, t0: number, t: number, t1: number): number[] {
    const alpha = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    const result = new Array<number>(this.#itemSize);
    const base0 = index * this.#itemSize;
    const base1 = (index + 1) * this.#itemSize;
    for (let j = 0; j < this.#itemSize; j++) {
      result[j] =
        this.#values[base0 + j] +
        alpha * (this.#values[base1 + j] - this.#values[base0 + j]);
    }
    return result;
  }

  /** Returns interpolated values at the given time using binary search. */
  getValueAtTime(time: number): number[] {
    const times = this.#times;
    const n = times.length;

    if (n === 0) return new Array<number>(this.#itemSize).fill(0);
    if (n === 1 || time <= times[0]) {
      const result = new Array<number>(this.#itemSize);
      for (let j = 0; j < this.#itemSize; j++) result[j] = this.#values[j];
      return result;
    }
    if (time >= times[n - 1]) {
      const base = (n - 1) * this.#itemSize;
      const result = new Array<number>(this.#itemSize);
      for (let j = 0; j < this.#itemSize; j++) {
        result[j] = this.#values[base + j];
      }
      return result;
    }

    const index = this.#findKeyframe(time);
    return this.interpolate(index, times[index], time, times[index + 1]);
  }

  /** Binary search returning index of the keyframe just before time. */
  #findKeyframe(time: number): number {
    const times = this.#times;
    let lo = 0;
    let hi = times.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= time) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return lo;
  }
}
