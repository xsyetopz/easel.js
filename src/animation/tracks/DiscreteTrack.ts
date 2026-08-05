import {
  copyTrackAtIndices,
  Interpolation,
  type TrackValue,
  type TrackValueType,
  validateTimeRange,
} from "../Track.ts";

/** Immutable scalar keyframes sampled with discrete interpolation. */
export abstract class DiscreteTrack<Value extends boolean | string> {
  readonly #name: string;
  readonly #times: Float32Array;
  readonly #values: readonly Value[];
  readonly #valueType: Extract<TrackValueType, "boolean" | "string">;

  protected constructor(
    name: string,
    times: Float32Array | readonly number[],
    values: readonly Value[],
    valueType: Extract<TrackValueType, "boolean" | "string">,
  ) {
    this.#name = name;
    this.#times = new Float32Array(times);
    this.#values = Object.freeze([...values]);
    this.#valueType = valueType;
    this.#validate();
  }

  /** Name used to bind this track to an object property. */
  get name(): string {
    return this.#name;
  }

  /** Keyframe times in seconds, stored in strictly increasing order. */
  get times(): Float32Array {
    return this.#times;
  }

  /** Immutable boolean or string value for each keyframe. */
  get values(): readonly Value[] {
    return this.#values;
  }

  /** Always one scalar value per keyframe for a discrete track. */
  get itemSize(): 1 {
    return 1;
  }

  /** Always `Interpolation.Discrete` for this track. */
  get interpolation(): typeof Interpolation.Discrete {
    return Interpolation.Discrete;
  }

  /** Runtime label identifying boolean or string values. */
  get valueType(): Extract<TrackValueType, "boolean" | "string"> {
    return this.#valueType;
  }

  /** Returns the most recent discrete value at `time` seconds. */
  getValueAtTime(time: number): Value[] {
    const count = this.#times.length;
    if (count === 0) return [];
    if (count === 1 || time <= this.#times[0]) return [this.#values[0]];
    if (time >= this.#times[count - 1]) return [this.#values[count - 1]];
    let low = 0;
    let high = count - 1;
    while (low < high - 1) {
      const middle = (low + high) >> 1;
      if (this.#times[middle] <= time) low = middle;
      else high = middle;
    }
    return [this.#values[low]];
  }

  /** Returns an independent copy with cloned keyframe storage. */
  clone(): this {
    return copyTrackAtIndices(this, this.#indices()) as this;
  }

  /** Returns a copy with every keyframe shifted by `timeOffset` seconds. */
  shift(timeOffset: number): this {
    if (!Number.isFinite(timeOffset))
      throw new RangeError("Track timeOffset must be finite.");
    return copyTrackAtIndices(
      this,
      this.#indices(),
      (time) => time + timeOffset,
    ) as this;
  }

  /** Returns a copy with keyframe times multiplied by a positive scale. */
  scale(timeScale: number): this {
    if (!Number.isFinite(timeScale) || timeScale <= 0) {
      throw new RangeError(
        "Track timeScale must be finite and greater than zero.",
      );
    }
    return copyTrackAtIndices(
      this,
      this.#indices(),
      (time) => time * timeScale,
    ) as this;
  }

  /** Returns a copy containing keys in the inclusive time interval. */
  trim(startTime: number, endTime: number): this {
    validateTimeRange(startTime, endTime);
    return copyTrackAtIndices(
      this,
      this.#indices().filter(
        (index) =>
          this.#times[index] >= startTime && this.#times[index] <= endTime,
      ),
    ) as this;
  }

  /** Checks ordering, finite times, value count, and value types. */
  validate(): boolean {
    if (this.#values.length !== this.#times.length) return false;
    for (let index = 0; index < this.#times.length; index++) {
      if (!Number.isFinite(this.#times[index])) return false;
      if (index > 0 && this.#times[index] <= this.#times[index - 1])
        return false;
      if (typeof this.#values[index] !== this.#valueType) return false;
    }
    return true;
  }

  /** Returns a copy with adjacent duplicate values removed. */
  optimize(): this {
    if (this.#times.length < 2) return this.clone();
    const indices = [0];
    for (let index = 1; index < this.#times.length; index++) {
      if (this.#values[index] !== this.#values[index - 1]) indices.push(index);
    }
    return copyTrackAtIndices(this, indices) as this;
  }

  #indices(): number[] {
    return Array.from({ length: this.#times.length }, (_, index) => index);
  }

  #validate(): void {
    if (this.#values.length !== this.#times.length) {
      throw new RangeError(
        "Discrete track values length must equal times length.",
      );
    }
    for (let index = 0; index < this.#times.length; index++) {
      if (
        !Number.isFinite(this.#times[index]) ||
        (index > 0 && !(this.#times[index] > this.#times[index - 1]))
      ) {
        throw new RangeError(
          "Discrete track times must be finite and strictly increasing.",
        );
      }
    }
    for (const value of this.#values as readonly TrackValue[]) {
      if (typeof value !== this.valueType) {
        throw new TypeError(
          `Discrete track values must have type ${this.valueType}.`,
        );
      }
    }
  }
}
