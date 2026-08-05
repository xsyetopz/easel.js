/** Numeric keyframe interpolation modes supported by the track sampler. */
export const Interpolation = {
  Discrete: 2300,
  Linear: 2301,
  Smooth: 2302,
  Bezier: 2303,
} as const;

/** Union of interpolation identifiers supported by numeric tracks. */
export type InterpolationMode =
  (typeof Interpolation)[keyof typeof Interpolation];

/** Endpoint behavior for smooth interpolation. */
export const InterpolationEnding = {
  ZeroCurvature: 2400,
  ZeroSlope: 2401,
  WrapAround: 2402,
} as const;

/** Union of endpoint policies used by smooth interpolation. */
export type InterpolationEndingMode =
  (typeof InterpolationEnding)[keyof typeof InterpolationEnding];

/** Construction options for numeric keyframe tracks. */
export interface TrackOptions {
  /** Number of scalar values stored for each keyframe. */
  readonly itemSize?: number;
  /** Interpolation mode used between adjacent keyframes. */
  readonly interpolation?: InterpolationMode;
  /** Optional incoming cubic tangent time/value pairs. */
  readonly inTangents?: Float32Array | readonly number[];
  /** Optional outgoing cubic tangent time/value pairs. */
  readonly outTangents?: Float32Array | readonly number[];
  /** Smooth-interpolation endpoint policy before the first keyframe. */
  readonly endingStart?: InterpolationEndingMode;
  /** Smooth-interpolation endpoint policy after the last keyframe. */
  readonly endingEnd?: InterpolationEndingMode;
}

/** Scalar value types supported by animation tracks. */
export type TrackValue = number | boolean | string;
/** Runtime labels describing track interpolation value semantics. */
export type TrackValueType = "number" | "quaternion" | "boolean" | "string";

/** Common public track contract used by animation clips and mixers. */
export interface AnimationTrack<Value extends TrackValue = TrackValue> {
  /** Name used to bind this track to an object property. */
  readonly name: string;
  /** Keyframe times in seconds, stored in strictly increasing order. */
  readonly times: Float32Array;
  /** Flattened keyframe values grouped by `itemSize`. */
  readonly values: Float32Array | readonly Value[];
  /** Number of scalar values stored for each keyframe. */
  readonly itemSize: number;
  /** Interpolation mode used between adjacent keyframes. */
  readonly interpolation: InterpolationMode;
  /** Runtime value semantics selected by the track implementation. */
  readonly valueType: TrackValueType;
  /** Samples and returns one value group at `time` seconds. */
  getValueAtTime(time: number): Value[];
  /** Returns an independent copy with cloned keyframe storage. */
  clone(): AnimationTrack<Value>;
  /** Returns a copy with every keyframe shifted by `timeOffset` seconds. */
  shift(timeOffset: number): AnimationTrack<Value>;
  /** Returns a copy with keyframe times multiplied by a positive scale. */
  scale(timeScale: number): AnimationTrack<Value>;
  /** Returns a copy containing keys in the inclusive time interval. */
  trim(startTime: number, endTime: number): AnimationTrack<Value>;
  /** Checks keyframe ordering, finite values, and storage length. */
  validate(): boolean;
  /** Returns a copy with redundant interior keyframes removed. */
  optimize(): AnimationTrack<Value>;
}

/** Base numeric keyframe track with explicit interpolation and typed storage. */
export class Track<ValueType extends TrackValueType = "number"> {
  readonly #name: string;
  readonly #times: Float32Array;
  readonly #values: Float32Array;
  readonly #itemSize: number;
  readonly #interpolation: InterpolationMode;
  readonly #inTangents: Float32Array | undefined;
  readonly #outTangents: Float32Array | undefined;
  readonly #endingStart: InterpolationEndingMode;
  readonly #endingEnd: InterpolationEndingMode;

  /** Creates a numeric track from keyframe times, values, and interpolation options. */
  constructor(
    name: string,
    times: Float32Array | readonly number[],
    values: Float32Array | readonly number[],
    options: TrackOptions = {},
  ) {
    this.#name = name;
    this.#times = new Float32Array(times);
    this.#values = new Float32Array(values);
    this.#itemSize = options.itemSize ?? 1;
    this.#interpolation = options.interpolation ?? Interpolation.Linear;
    this.#inTangents = toFloat32Array(options.inTangents);
    this.#outTangents = toFloat32Array(options.outTangents);
    this.#endingStart =
      options.endingStart ?? InterpolationEnding.ZeroCurvature;
    this.#endingEnd = options.endingEnd ?? InterpolationEnding.ZeroCurvature;
    this.#validate();
  }

  /** Name used to bind this track to an object property. */
  get name(): string {
    return this.#name;
  }

  /** Mutable keyframe times in seconds, stored in strictly increasing order. */
  get times(): Float32Array {
    return this.#times;
  }

  /** Mutable flattened keyframe values grouped by `itemSize`. */
  get values(): Float32Array {
    return this.#values;
  }

  /** Number of scalar values stored for each keyframe. */
  get itemSize(): number {
    return this.#itemSize;
  }

  /** Interpolation mode used between adjacent keyframes. */
  get interpolation(): InterpolationMode {
    return this.#interpolation;
  }

  /** Runtime value semantics selected by the track implementation. */
  get valueType(): ValueType {
    return "number" as ValueType;
  }

  /** Optional incoming cubic tangent time/value pairs. */
  get inTangents(): Float32Array | undefined {
    return this.#inTangents;
  }

  /** Optional outgoing cubic tangent time/value pairs. */
  get outTangents(): Float32Array | undefined {
    return this.#outTangents;
  }

  /** Smooth-interpolation endpoint policy before the first keyframe. */
  get endingStart(): InterpolationEndingMode {
    return this.#endingStart;
  }

  /** Smooth-interpolation endpoint policy after the last keyframe. */
  get endingEnd(): InterpolationEndingMode {
    return this.#endingEnd;
  }

  /** Interpolates the interval beginning at `index` for the supplied times. */
  interpolate(index: number, t0: number, t: number, t1: number): number[] {
    if (this.#interpolation === Interpolation.Discrete) {
      return this.#copyValue(index);
    }
    if (this.#interpolation === Interpolation.Smooth) {
      return this.#interpolateSmooth(index, t0, t, t1);
    }
    if (this.#interpolation === Interpolation.Bezier) {
      return this.#interpolateBezier(index, t0, t, t1);
    }
    return this.#interpolateLinear(index, t0, t, t1);
  }

  /** Samples interpolated values at `time` seconds using binary search. */
  getValueAtTime(time: number): number[] {
    const times = this.#times;
    const count = times.length;
    if (count === 0) return new Array<number>(this.#itemSize).fill(0);
    if (count === 1 || time <= times[0]) return this.#copyValue(0);
    if (time >= times[count - 1]) return this.#copyValue(count - 1);

    const index = this.#findKeyframe(time);
    return this.interpolate(index, times[index], time, times[index + 1]);
  }

  /** Returns an independent track with cloned keyframes and options. */
  clone(): this {
    return copyTrackAtIndices(this, allTrackIndices(this)) as this;
  }

  /** Returns a copy with every keyframe shifted by `timeOffset` seconds. */
  shift(timeOffset: number): this {
    if (!Number.isFinite(timeOffset)) {
      throw new RangeError("Track timeOffset must be finite.");
    }
    return copyTrackAtIndices(
      this,
      allTrackIndices(this),
      (time) => time + timeOffset,
    ) as this;
  }

  /** Returns a copy with every keyframe time multiplied by `timeScale`. */
  scale(timeScale: number): this {
    if (!Number.isFinite(timeScale) || timeScale <= 0) {
      throw new RangeError(
        "Track timeScale must be finite and greater than zero.",
      );
    }
    return copyTrackAtIndices(
      this,
      allTrackIndices(this),
      (time) => time * timeScale,
    ) as this;
  }

  /** Returns a copy containing keys in the inclusive `[startTime, endTime]` interval. */
  trim(startTime: number, endTime: number): this {
    validateTimeRange(startTime, endTime);
    const indices: number[] = [];
    for (let index = 0; index < this.#times.length; index++) {
      const time = this.#times[index];
      if (time >= startTime && time <= endTime) indices.push(index);
    }
    return copyTrackAtIndices(this, indices) as this;
  }

  /** Checks keyframe order, finite numeric values, and typed-array length. */
  validate(): boolean {
    if (this.#values.length !== this.#times.length * this.#itemSize)
      return false;
    for (let index = 0; index < this.#times.length; index++) {
      if (!Number.isFinite(this.#times[index])) return false;
      if (index > 0 && this.#times[index] <= this.#times[index - 1])
        return false;
    }
    for (const value of this.#values) {
      if (!Number.isFinite(value)) return false;
    }
    return true;
  }

  /** Returns a copy with redundant interior keys removed when interpolation permits. */
  optimize(): this {
    if (
      this.#times.length < 3 ||
      this.#interpolation === Interpolation.Smooth
    ) {
      return this.clone();
    }
    const indices = [0];
    for (let index = 1; index < this.#times.length - 1; index++) {
      if (
        !(
          valuesEqualAt(this, index, index - 1) &&
          valuesEqualAt(this, index, index + 1)
        )
      ) {
        indices.push(index);
      }
    }
    indices.push(this.#times.length - 1);
    return copyTrackAtIndices(this, indices) as this;
  }

  #interpolateLinear(
    index: number,
    t0: number,
    t: number,
    t1: number,
  ): number[] {
    const alpha = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    const result = new Array<number>(this.#itemSize);
    const base0 = index * this.#itemSize;
    const base1 = base0 + this.#itemSize;
    for (let component = 0; component < this.#itemSize; component++) {
      result[component] =
        this.#values[base0 + component] +
        alpha *
          (this.#values[base1 + component] - this.#values[base0 + component]);
    }
    return result;
  }

  #interpolateSmooth(
    index: number,
    t0: number,
    t: number,
    t1: number,
  ): number[] {
    const previous = this.#smoothPrevious(index, t0, t1);
    const next = this.#smoothNext(index, t0, t1);
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
    const result = new Array<number>(this.#itemSize);
    for (let component = 0; component < this.#itemSize; component++) {
      result[component] =
        sPrevious * this.#values[previous.index * this.#itemSize + component] +
        s0 * this.#values[index * this.#itemSize + component] +
        s1 * this.#values[(index + 1) * this.#itemSize + component] +
        sNext * this.#values[next.index * this.#itemSize + component];
    }
    return result;
  }

  #smoothPrevious(
    index: number,
    t0: number,
    t1: number,
  ): { index: number; time: number } {
    if (index > 0) return { index: index - 1, time: this.#times[index - 1] };
    if (this.#endingStart === InterpolationEnding.ZeroSlope) {
      return { index: index + 1, time: 2 * t0 - t1 };
    }
    if (
      this.#endingStart === InterpolationEnding.WrapAround &&
      this.#times.length > 2
    ) {
      const previous = this.#times.length - 2;
      return {
        index: previous,
        time: t0 + this.#times[previous] - this.#times[previous + 1],
      };
    }
    return { index: index + 1, time: t1 };
  }

  #smoothNext(
    index: number,
    t0: number,
    t1: number,
  ): { index: number; time: number } {
    const next = index + 2;
    if (next < this.#times.length)
      return { index: next, time: this.#times[next] };
    if (this.#endingEnd === InterpolationEnding.ZeroSlope) {
      return { index: index + 1, time: 2 * t1 - t0 };
    }
    if (
      this.#endingEnd === InterpolationEnding.WrapAround &&
      this.#times.length > 2
    ) {
      return {
        index: 1,
        time: t1 + this.#times[1] - this.#times[0],
      };
    }
    return { index, time: t0 };
  }

  #interpolateBezier(
    index: number,
    t0: number,
    t: number,
    t1: number,
  ): number[] {
    const inTangents = this.#inTangents as Float32Array;
    const outTangents = this.#outTangents as Float32Array;
    const result = new Array<number>(this.#itemSize);
    const tangentStride = this.#itemSize * 2;
    for (let component = 0; component < this.#itemSize; component++) {
      const value0 = this.#values[index * this.#itemSize + component];
      const value1 = this.#values[(index + 1) * this.#itemSize + component];
      const outOffset = index * tangentStride + component * 2;
      const inOffset = (index + 1) * tangentStride + component * 2;
      const control0Time = outTangents[outOffset];
      const control0Value = outTangents[outOffset + 1];
      const control1Time = inTangents[inOffset];
      const control1Value = inTangents[inOffset + 1];
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
        parameter = Math.max(0, Math.min(1, parameter - error / derivative));
      }
      const oneMinus = 1 - parameter;
      const parameter2 = parameter * parameter;
      result[component] =
        oneMinus * oneMinus * oneMinus * value0 +
        3 * oneMinus * oneMinus * parameter * control0Value +
        3 * oneMinus * parameter2 * control1Value +
        parameter2 * parameter * value1;
    }
    return result;
  }

  #copyValue(index: number): number[] {
    const base = index * this.#itemSize;
    return Array.from(this.#values.subarray(base, base + this.#itemSize));
  }

  #findKeyframe(time: number): number {
    let low = 0;
    let high = this.#times.length - 1;
    while (low < high - 1) {
      const middle = (low + high) >> 1;
      if (this.#times[middle] <= time) low = middle;
      else high = middle;
    }
    return low;
  }

  #validate(): void {
    if (!Number.isSafeInteger(this.#itemSize) || this.#itemSize <= 0) {
      throw new RangeError("Track itemSize must be a positive safe integer.");
    }
    if (this.#values.length !== this.#times.length * this.#itemSize) {
      throw new RangeError(
        "Track values length must equal times length * itemSize.",
      );
    }
    for (let index = 1; index < this.#times.length; index++) {
      if (!(this.#times[index] > this.#times[index - 1])) {
        throw new RangeError(
          "Track times must be finite and strictly increasing.",
        );
      }
    }
    if (this.#times.length > 0 && !Number.isFinite(this.#times[0])) {
      throw new RangeError(
        "Track times must be finite and strictly increasing.",
      );
    }
    if (this.#interpolation === Interpolation.Bezier) {
      const expected = this.#times.length * this.#itemSize * 2;
      if (
        this.#inTangents?.length !== expected ||
        this.#outTangents?.length !== expected
      ) {
        throw new RangeError(
          "Bezier interpolation requires inTangents and outTangents with times.length * itemSize * 2 values.",
        );
      }
    }
  }
}

function toFloat32Array(
  values: Float32Array | readonly number[] | undefined,
): Float32Array | undefined {
  if (values === undefined) return;
  return new Float32Array(values);
}

/** Copies selected keyframes and preserves the track’s interpolation options. */
export function copyTrackAtIndices(
  track: AnimationTrack,
  indices: readonly number[],
  transformTime: (time: number) => number = (time: number) => time,
): AnimationTrack {
  const times = new Float32Array(
    indices.map((index) => transformTime(track.times[index])),
  );
  const TrackConstructor = track.constructor as new (
    name: string,
    times: Float32Array,
    values: Float32Array | readonly TrackValue[],
    options?: TrackOptions,
  ) => AnimationTrack;
  if (track.valueType === "boolean" || track.valueType === "string") {
    const values = indices.map((index) => track.values[index] as TrackValue);
    return new TrackConstructor(track.name, times, values);
  }

  const size = track.itemSize;
  const values = new Float32Array(indices.length * size);
  for (let outputIndex = 0; outputIndex < indices.length; outputIndex++) {
    const inputOffset = indices[outputIndex] * size;
    values.set(
      (track.values as Float32Array).subarray(inputOffset, inputOffset + size),
      outputIndex * size,
    );
  }
  const numericTrack = track as Track;
  let options: TrackOptions = {
    itemSize: size,
    interpolation: numericTrack.interpolation,
    endingStart: numericTrack.endingStart,
    endingEnd: numericTrack.endingEnd,
  };
  if (numericTrack.interpolation === Interpolation.Bezier) {
    const tangentSize = size * 2;
    const inTangents = copyTangents(
      numericTrack.inTangents,
      indices,
      tangentSize,
      transformTime,
    );
    const outTangents = copyTangents(
      numericTrack.outTangents,
      indices,
      tangentSize,
      transformTime,
    );
    options = { ...options, inTangents, outTangents };
  }
  return new TrackConstructor(track.name, times, values, options);
}

function copyTangents(
  source: Float32Array | undefined,
  indices: readonly number[],
  tangentSize: number,
  transformTime: (time: number) => number,
): Float32Array {
  const result = new Float32Array(indices.length * tangentSize);
  if (!source) return result;
  for (let outputIndex = 0; outputIndex < indices.length; outputIndex++) {
    const inputOffset = indices[outputIndex] * tangentSize;
    const outputOffset = outputIndex * tangentSize;
    for (let component = 0; component < tangentSize; component += 2) {
      result[outputOffset + component] = transformTime(
        source[inputOffset + component],
      );
      result[outputOffset + component + 1] =
        source[inputOffset + component + 1];
    }
  }
  return result;
}

function allTrackIndices(track: AnimationTrack): number[] {
  return Array.from({ length: track.times.length }, (_, index) => index);
}

function valuesEqualAt(
  track: AnimationTrack,
  left: number,
  right: number,
): boolean {
  for (let component = 0; component < track.itemSize; component++) {
    if (
      track.values[left * track.itemSize + component] !==
      track.values[right * track.itemSize + component]
    )
      return false;
  }
  return true;
}

/** Validates a finite non-decreasing keyframe time interval. */
export function validateTimeRange(startTime: number, endTime: number): void {
  if (
    !(Number.isFinite(startTime) && Number.isFinite(endTime)) ||
    startTime > endTime
  ) {
    throw new RangeError(
      "Track time range must be finite with startTime <= endTime.",
    );
  }
}
