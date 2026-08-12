import { AnimationBlend, AnimationClip } from "./AnimationClip.ts";
import {
  copyTrackAtIndices,
  type AnimationTrack,
  type TrackValue,
} from "./Track.ts";
import { QuaternionTrack } from "./tracks/QuaternionTrack.ts";

/** Numeric typed-array storage accepted by animation utilities. */
export type NumericTypedArray =
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array;

/** Constructor shape shared by supported numeric typed arrays. */
export interface NumericTypedArrayConstructor<
  ArrayType extends NumericTypedArray,
> {
  /** Constructs an array from array-like numeric values. */
  new (values: ArrayLike<number>): ArrayType;
  /** Number of bytes used by one array element. */
  readonly BYTES_PER_ELEMENT: number;
}

/** Flat keyframe payload with a time and named value property. */
export interface FlatKeyframe {
  /** Keyframe time in seconds. */
  readonly time: number;
  /** Additional named value fields supplied by serialized keyframes. */
  readonly [property: string]: unknown;
}

type FlatKeyframeValue = TrackValue | readonly TrackValue[];

/** Copies array-like values into a regular number array. */
export function convertArray(
  values: ArrayLike<number>,
  type: ArrayConstructor,
): number[];
/** Copies array-like values into the supplied numeric typed-array class. */
export function convertArray<ArrayType extends NumericTypedArray>(
  values: ArrayLike<number>,
  type: NumericTypedArrayConstructor<ArrayType>,
): ArrayType;
/** Copies array-like values into the requested regular or typed array class. */
export function convertArray<ArrayType extends NumericTypedArray>(
  values: ArrayLike<number>,
  type: ArrayConstructor | NumericTypedArrayConstructor<ArrayType>,
): number[] | ArrayType {
  if (type === Array) return Array.from(values);
  const TypedArray = type as NumericTypedArrayConstructor<ArrayType>;
  return new TypedArray(values);
}

/** Returns whether `value` is one of the supported numeric typed arrays. */
export function isTypedArray(value: unknown): value is NumericTypedArray {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

/** Returns stable ascending indices for finite keyframe times. */
export function getKeyframeOrder(times: ArrayLike<number>): number[] {
  const order = Array.from({ length: times.length }, (_, index) => index);
  for (const time of Array.from(times)) {
    if (!Number.isFinite(time)) {
      throw new RangeError("AnimationUtils keyframe times must be finite.");
    }
  }
  return order.sort(
    (left, right) => times[left] - times[right] || left - right,
  );
}

/** Reorders strided values using keyframe indices while preserving array kind. */
export function sortedArray<
  ArrayType extends NumericTypedArray | readonly number[],
>(
  values: ArrayType,
  stride: number,
  order: readonly number[],
): ArrayType extends NumericTypedArray ? ArrayType : number[] {
  if (!Number.isSafeInteger(stride) || stride <= 0) {
    throw new RangeError(
      "AnimationUtils stride must be a positive safe integer.",
    );
  }
  if (values.length !== order.length * stride) {
    throw new RangeError(
      "AnimationUtils order length * stride must equal values length.",
    );
  }
  const result = new Array<number>(values.length);
  let output = 0;
  for (const index of order) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= order.length) {
      throw new RangeError(
        "AnimationUtils order indices must reference existing keyframes.",
      );
    }
    for (let component = 0; component < stride; component++) {
      result[output++] = values[index * stride + component];
    }
  }
  if (isTypedArray(values)) {
    const Constructor =
      values.constructor as NumericTypedArrayConstructor<NumericTypedArray>;
    return new Constructor(result) as ArrayType extends NumericTypedArray
      ? ArrayType
      : number[];
  }
  return result as ArrayType extends NumericTypedArray ? ArrayType : number[];
}

/** Appends one named value from each flat keyframe to parallel time/value arrays. */
export function flattenJSON(
  jsonKeys: readonly FlatKeyframe[],
  times: number[],
  values: TrackValue[],
  valuePropertyName: string,
): void {
  for (const key of jsonKeys) {
    const value = key[valuePropertyName] as FlatKeyframeValue | undefined;
    if (value === undefined) continue;
    if (!Number.isFinite(key.time)) {
      throw new RangeError(
        "AnimationUtils flattened keyframe times must be finite.",
      );
    }
    times.push(key.time);
    if (Array.isArray(value)) values.push(...value);
    else values.push(value as TrackValue);
  }
}

/** Extracts a half-open frame interval at `fps` and retimes it to start at zero. */
export function subclip(
  clip: AnimationClip,
  name: string,
  startFrame: number,
  endFrame: number,
  fps = 30,
): AnimationClip {
  validateFrameRange(startFrame, endFrame, fps);
  const cloned = clip.clone();
  const newTracks: AnimationTrack[] = [];
  for (const track of cloned.tracks) {
    const indices: number[] = [];
    for (let index = 0; index < track.times.length; index++) {
      const frame = track.times[index] * fps;
      if (frame >= startFrame && frame < endFrame) indices.push(index);
    }
    if (indices.length > 0) {
      newTracks.push(copyTrackAtIndices(track, indices));
    }
  }

  const minStartTime = newTracks.reduce(
    (minimum, track) => Math.min(minimum, track.times[0] ?? minimum),
    Number.POSITIVE_INFINITY,
  );
  const shiftedTracks =
    minStartTime === Number.POSITIVE_INFINITY
      ? newTracks
      : newTracks.map((track) => track.shift(-minStartTime));
  const result = new AnimationClip(
    name,
    cloned.duration,
    shiftedTracks,
    cloned.blendMode,
  );
  result.userData = cloned.userData;
  return result.resetDuration();
}

/** Returns a cloned clip whose numeric tracks are relative to `referenceFrame` at `fps`. */
export function makeClipAdditive(
  clip: AnimationClip,
  referenceFrame = 0,
  referenceClip: AnimationClip = clip,
  fps = 30,
): AnimationClip {
  validateReferenceFrame(referenceFrame, fps);
  const result = clip.clone();
  const referenceTime = referenceFrame / fps;
  for (const track of result.tracks) {
    if (track.valueType === "boolean" || track.valueType === "string") continue;
    const referenceTrack = referenceClip.tracks.find(
      (candidate) =>
        candidate.name === track.name &&
        candidate.valueType === track.valueType,
    );
    if (!referenceTrack) continue;
    if (referenceTrack.itemSize !== track.itemSize) {
      throw new RangeError(
        `AnimationUtils additive tracks named ${track.name} must have matching itemSize values.`,
      );
    }
    const referenceValues = referenceTrack.getValueAtTime(
      referenceTime,
    ) as number[];
    const values = track.values as Float32Array;
    if (track instanceof QuaternionTrack) {
      if (!(referenceTrack instanceof QuaternionTrack)) {
        throw new TypeError(
          `AnimationUtils additive track ${track.name} must match QuaternionTrack type.`,
        );
      }
      applyQuaternionReference(values, referenceValues);
    } else {
      subtractReference(values, referenceValues, track.itemSize);
    }
  }
  result.blendMode = AnimationBlend.Additive;
  return result;
}

function validateFrameRange(
  startFrame: number,
  endFrame: number,
  fps: number,
): void {
  if (
    !(Number.isFinite(startFrame) && Number.isFinite(endFrame)) ||
    startFrame > endFrame
  ) {
    throw new RangeError(
      "AnimationUtils frame range must be finite with startFrame <= endFrame.",
    );
  }
  validateFps(fps);
}

function validateReferenceFrame(referenceFrame: number, fps: number): void {
  if (!Number.isFinite(referenceFrame)) {
    throw new RangeError("AnimationUtils referenceFrame must be finite.");
  }
  validateFps(fps);
}

function validateFps(fps: number): void {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError(
      "AnimationUtils fps must be finite and greater than zero.",
    );
  }
}

function subtractReference(
  values: Float32Array,
  reference: readonly number[],
  itemSize: number,
): void {
  for (let offset = 0; offset < values.length; offset += itemSize) {
    for (let component = 0; component < itemSize; component++) {
      values[offset + component] -= reference[component];
    }
  }
}

function applyQuaternionReference(
  values: Float32Array,
  reference: readonly number[],
): void {
  const [rx, ry, rz, rw] = normalizedConjugate(reference);
  for (let offset = 0; offset < values.length; offset += 4) {
    const x = values[offset];
    const y = values[offset + 1];
    const z = values[offset + 2];
    const w = values[offset + 3];
    values[offset] = rx * w + rw * x + ry * z - rz * y;
    values[offset + 1] = ry * w + rw * y + rz * x - rx * z;
    values[offset + 2] = rz * w + rw * z + rx * y - ry * x;
    values[offset + 3] = rw * w - rx * x - ry * y - rz * z;
  }
}

function normalizedConjugate(
  reference: readonly number[],
): readonly [number, number, number, number] {
  const length = Math.hypot(
    reference[0],
    reference[1],
    reference[2],
    reference[3],
  );
  if (length === 0) {
    throw new RangeError(
      "AnimationUtils quaternion reference must be non-zero.",
    );
  }
  return [
    -reference[0] / length,
    -reference[1] / length,
    -reference[2] / length,
    reference[3] / length,
  ];
}
