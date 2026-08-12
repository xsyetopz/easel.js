import {
  type AnimationTrack,
  type InterpolationEndingMode,
  type InterpolationMode,
  Track,
  type TrackOptions,
} from "./Track.ts";
import { BooleanTrack } from "./tracks/BooleanTrack.ts";
import { ColorTrack } from "./tracks/ColorTrack.ts";
import { NumberTrack } from "./tracks/NumberTrack.ts";
import { QuaternionTrack } from "./tracks/QuaternionTrack.ts";
import { StringTrack } from "./tracks/StringTrack.ts";
import { VectorTrack } from "./tracks/VectorTrack.ts";

const MORPH_TARGET_NAME_PATTERN = /^(?<prefix>[\w-]*?)(?<index>\d+)$/u;

/** Animation blending modes supported by the CPU property mixer. */
export const AnimationBlend = {
  Normal: 2500,
  Additive: 2501,
} as const;

/** Blend operation used when combining clip track values. */
export type AnimationBlendMode =
  (typeof AnimationBlend)[keyof typeof AnimationBlend];

/** Serialized keyframe-track payload accepted by `animationClipFromJson`. */
export interface AnimationClipTrackJSON {
  /** Track value kind used to select the concrete track implementation. */
  readonly type:
    | "boolean"
    | "bool"
    | "color"
    | "number"
    | "quaternion"
    | "string"
    | "vector";
  /** Track name used by property bindings and serialized output. */
  readonly name: string;
  /** Keyframe times in seconds, in strictly increasing order. */
  readonly times: number[];
  /** Flattened keyframe values, grouped by `itemSize` when present. */
  readonly values: Array<boolean | number | string>;
  /** Number of scalar values stored for each keyframe. */
  readonly itemSize?: number;
  /** Interpolation mode used between adjacent keyframes. */
  readonly interpolation?: InterpolationMode;
  /** Optional incoming cubic tangent values, including their time coordinates. */
  readonly inTangents?: number[];
  /** Optional outgoing cubic tangent values, including their time coordinates. */
  readonly outTangents?: number[];
  /** Smooth-interpolation endpoint policy before the first keyframe. */
  readonly endingStart?: InterpolationEndingMode;
  /** Smooth-interpolation endpoint policy after the last keyframe. */
  readonly endingEnd?: InterpolationEndingMode;
}

/** Serialized animation-clip payload with optional duration, tracks, and frame rate. */
export interface AnimationClipJSON {
  /** Name used by clip lookup and serialized output. */
  readonly name?: string;
  /** Clip duration in seconds; omitted values are computed from the tracks. */
  readonly duration?: number;
  /** Serialized keyframe tracks that make up the clip. */
  readonly tracks?: AnimationClipTrackJSON[];
  /** Optional source frame rate used by THREE-compatible JSON. */
  readonly fps?: number;
  /** Optional blend operation applied when the clip contributes track values. */
  readonly blendMode?: AnimationBlendMode;
  /** Optional stable clip identifier used by THREE-compatible serialization. */
  readonly uuid?: string;
  /** Optional stringified application metadata used by THREE-compatible serialization. */
  readonly userData?: string;
}

/** Finds a named clip in an array or serialized animation collection. */
export function findAnimationClip(
  clips: readonly AnimationClip[] | object,
  name: string,
): AnimationClip | undefined {
  const source = Array.isArray(clips)
    ? clips
    : animationListFromObject(clips as Record<string, unknown>);
  let match: AnimationClip | undefined;
  for (const clip of source) {
    if (clip.name !== name) continue;
    match = clip;
    break;
  }
  return match;
}

/** Builds an animation clip from a validated serialized payload. */
export function animationClipFromJson(json: AnimationClipJSON): AnimationClip {
  validateClipJSON(json);
  const scale = json.fps === undefined ? 1 : 1 / validateFps(json.fps);
  const clip = new AnimationClip(
    json.name ?? "",
    json.duration ?? -1,
    (json.tracks ?? []).map((track) => trackFromJSON(track, scale)),
    json.blendMode ?? AnimationBlend.Normal,
  );
  if (json.uuid !== undefined) {
    if (typeof json.uuid !== "string") {
      throw new TypeError("Animation clip uuid must be a string.");
    }
    Object.defineProperty(clip, "uuid", {
      value: json.uuid,
      enumerable: true,
      writable: false,
    });
  }
  if (json.userData !== undefined) {
    if (typeof json.userData !== "string") {
      throw new TypeError("Animation clip userData must be a string.");
    }
    clip.userData = parseUserData(json.userData);
  }
  return clip;
}

/** Serializes an animation clip using THREE-compatible metadata fields. */
export function animationClipToJSON(clip: AnimationClip): AnimationClipJSON {
  return {
    ...clip.toJSON(),
    uuid: clip.uuid,
    userData: JSON.stringify(clip.userData),
  };
}

/** Named collection of keyframe tracks representing one animation sequence. */
export class AnimationClip {
  /** Stable auto-generated identifier. */
  readonly uuid: string = crypto.randomUUID();
  /** Application metadata associated with this clip. */
  userData: Record<string, unknown> = {};

  readonly #name: string;
  #duration: number;
  readonly #tracks: AnimationTrack[];
  #blendMode: AnimationBlendMode;

  /**
   * @param name Name used by clip lookup and serialized output.
   * @param duration Duration in seconds; `-1` derives it from the tracks.
   * @param tracks Keyframe tracks sampled by the clip.
   * @param blendMode Normal or additive blending for the clip.
   */
  constructor(
    name: string = "",
    duration: number = -1,
    tracks: AnimationTrack[] = [],
    blendMode: AnimationBlendMode = AnimationBlend.Normal,
  ) {
    if (
      blendMode !== AnimationBlend.Normal &&
      blendMode !== AnimationBlend.Additive
    ) {
      throw new RangeError("invalid animation blend mode");
    }
    this.#name = name;
    this.#tracks = tracks;
    this.#duration = duration === -1 ? this.#computeDuration() : duration;
    this.#blendMode = blendMode;
  }

  /** Name used by clip lookup and serialized output. */
  get name(): string {
    return this.#name;
  }

  /** Clip duration in seconds; omitted values are computed from the tracks. */
  get duration(): number {
    return this.#duration;
  }

  /** Mutable keyframe-track list sampled by this clip. */
  get tracks(): AnimationTrack[] {
    return this.#tracks;
  }

  /** Blend operation applied when this clip contributes track values. */
  get blendMode(): AnimationBlendMode {
    return this.#blendMode;
  }

  /** Stores the normal or additive clip blend operation. */
  set blendMode(value: AnimationBlendMode) {
    if (value !== AnimationBlend.Normal && value !== AnimationBlend.Additive) {
      throw new RangeError("invalid animation blend mode");
    }
    this.#blendMode = value;
  }

  /** Serializes the clip name, duration, tracks, and blend mode. */
  toJSON(): AnimationClipJSON {
    return {
      name: this.#name,
      duration: this.#duration,
      tracks: this.#tracks.map(trackToJSON),
      blendMode: this.#blendMode,
    };
  }

  /** Recomputes duration from the maximum keyframe time across all tracks. */
  resetDuration(): this {
    this.#duration = this.#computeDuration();
    return this;
  }

  /** Removes keyframes outside [0, duration] from all tracks. */
  trim(): this {
    for (let trackIndex = 0; trackIndex < this.#tracks.length; trackIndex++) {
      this.#tracks[trackIndex] = this.#tracks[trackIndex].trim(
        0,
        this.#duration,
      );
    }
    return this;
  }

  /** Performs minimal validation on each track in the clip. */
  validate(): boolean {
    return this.#tracks.every((track) => track.validate());
  }

  /** Creates an independent clip with cloned track storage and metadata. */
  clone(): AnimationClip {
    const clone = new AnimationClip(
      this.#name,
      this.#duration,
      this.#tracks.map((track) => track.clone()),
      this.#blendMode,
    );
    clone.userData = JSON.parse(JSON.stringify(this.userData)) as Record<
      string,
      unknown
    >;
    return clone;
  }

  /** Removes redundant keyframes where the value does not change from the previous key. */
  optimize(): this {
    for (let trackIndex = 0; trackIndex < this.#tracks.length; trackIndex++) {
      this.#tracks[trackIndex] = this.#tracks[trackIndex].optimize();
    }
    return this;
  }

  #computeDuration(): number {
    let max = 0;
    for (const track of this.#tracks) {
      const t = track.times;
      const last = t.at(-1);
      if (last !== undefined && last > max) max = last;
    }
    return max;
  }
}

/** Finds a named clip in an array or serialized animation collection. */
export function findByName(
  clips: readonly AnimationClip[] | object,
  name: string,
): AnimationClip | undefined {
  return findAnimationClip(clips, name);
}

/** Builds an animation clip from a validated serialized payload. */
export function parse(json: AnimationClipJSON): AnimationClip {
  return animationClipFromJson(json);
}

/**
 * Creates a clip from a morph-target sequence, generating one NumberTrack per
 * morph target influence. Simplified for the CPU renderer — the tracks are
 * created for API parity but EASEL's binding layer does not bind
 * `morphTargetInfluences`.
 */
export function CreateFromMorphTargetSequence(
  name: string,
  morphTargetSequence: readonly { name: string }[],
  fps: number = 6,
  noLoop: boolean = false,
): AnimationClip {
  const numFrames = morphTargetSequence.length;
  if (numFrames === 0) return new AnimationClip(name, 0, []);
  validateFps(fps);
  const tracks: NumberTrack[] = [];

  for (let i = 0; i < numFrames; i++) {
    const times = [(i + numFrames - 1) % numFrames, i, (i + 1) % numFrames];
    const values = [0, 1, 0];
    const order = [0, 1, 2].sort(
      (left, right) => times[left] - times[right] || left - right,
    );
    const sortedTimes = order.map((index) => times[index]);
    const sortedValues = order.map((index) => values[index]);
    const firstValue = sortedValues.at(0);

    if (!noLoop && sortedTimes.at(0) === 0 && firstValue !== undefined) {
      sortedTimes.push(numFrames);
      sortedValues.push(firstValue);
    }

    const scaledTimes = sortedTimes.map((time) => time / fps);
    const track = new NumberTrack(
      `.morphTargetInfluences[${morphTargetSequence[i].name}]`,
      scaledTimes.map((_, index) => index),
      sortedValues,
    );
    track.times.set(scaledTimes);
    tracks.push(track);
  }

  return new AnimationClip(name, -1, tracks);
}

/**
 * Groups morph targets by name prefix (stripping trailing digits) and creates
 * one clip per group via {@link CreateFromMorphTargetSequence}.
 */
export function CreateClipsFromMorphTargetSequences(
  morphTargets: readonly { name: string }[],
  fps: number = 6,
  noLoop: boolean = false,
): AnimationClip[] {
  const groups = new Map<string, { name: string }[]>();

  for (const morphTarget of morphTargets) {
    const parts = MORPH_TARGET_NAME_PATTERN.exec(morphTarget.name);
    if (!parts) continue;
    const prefix = parts[1];
    let group = groups.get(prefix);
    if (!group) {
      group = [];
      groups.set(prefix, group);
    }
    group.push(morphTarget);
  }

  const clips: AnimationClip[] = [];
  for (const [prefix, group] of groups) {
    clips.push(CreateFromMorphTargetSequence(prefix, group, fps, noLoop));
  }
  return clips;
}

function trackFromJSON(
  json: AnimationClipTrackJSON,
  timeScale = 1,
): AnimationTrack {
  const times = json.times.map((time) => time * timeScale);
  if (json.type === "boolean" || json.type === "bool") {
    return new BooleanTrack(json.name, times, json.values as boolean[]);
  }
  if (json.type === "string") {
    return new StringTrack(json.name, times, json.values as string[]);
  }
  const options: TrackOptions = {
    ...(json.itemSize === undefined ? {} : { itemSize: json.itemSize }),
    ...(json.interpolation === undefined
      ? {}
      : { interpolation: json.interpolation }),
    ...(json.inTangents === undefined ? {} : { inTangents: json.inTangents }),
    ...(json.outTangents === undefined
      ? {}
      : { outTangents: json.outTangents }),
    ...(json.endingStart === undefined
      ? {}
      : { endingStart: json.endingStart }),
    ...(json.endingEnd === undefined ? {} : { endingEnd: json.endingEnd }),
  };
  const values = json.values as number[];
  if (json.type === "color")
    return new ColorTrack(json.name, times, values, options);
  if (json.type === "quaternion") {
    return new QuaternionTrack(json.name, times, values, options);
  }
  if (json.type === "vector")
    return new VectorTrack(json.name, times, values, options);
  return new NumberTrack(json.name, times, values, options);
}

function trackToJSON(track: AnimationTrack): AnimationClipTrackJSON {
  let type: AnimationClipTrackJSON["type"];
  if (track instanceof BooleanTrack) {
    type = "boolean";
  } else if (track instanceof StringTrack) {
    type = "string";
  } else if (track instanceof ColorTrack) {
    type = "color";
  } else if (track instanceof QuaternionTrack) {
    type = "quaternion";
  } else if (track instanceof VectorTrack) {
    type = "vector";
  } else {
    type = "number";
  }
  const json: AnimationClipTrackJSON = {
    type,
    name: track.name,
    times: Array.from(track.times),
    values: Array.from(track.values),
  };
  if (!(track instanceof Track)) return json;
  return {
    ...json,
    itemSize: track.itemSize,
    interpolation: track.interpolation,
    endingStart: track.endingStart,
    endingEnd: track.endingEnd,
    ...(track.inTangents ? { inTangents: Array.from(track.inTangents) } : {}),
    ...(track.outTangents
      ? { outTangents: Array.from(track.outTangents) }
      : {}),
  };
}

function animationListFromObject(
  object: Record<string, unknown>,
): readonly AnimationClip[] {
  const geometry = object["geometry"];
  if (isRecord(geometry) && Array.isArray(geometry["animations"])) {
    return geometry["animations"] as AnimationClip[];
  }
  return Array.isArray(object["animations"])
    ? (object["animations"] as AnimationClip[])
    : [];
}

function validateClipJSON(json: AnimationClipJSON): void {
  if (!isRecord(json))
    throw new TypeError("Animation clip JSON must be an object.");
  const fps = json["fps"];
  if (fps !== undefined) {
    if (typeof fps !== "number") {
      throw new TypeError("Animation clip fps must be a number.");
    }
    validateFps(fps);
  }
  const duration = json["duration"];
  if (
    duration !== undefined &&
    (typeof duration !== "number" ||
      !Number.isFinite(duration) ||
      (duration < 0 && duration !== -1))
  ) {
    throw new RangeError(
      "Animation clip duration must be finite and non-negative.",
    );
  }
  if (json["tracks"] !== undefined && !Array.isArray(json["tracks"])) {
    throw new TypeError("Animation clip tracks must be an array.");
  }
}

function validateFps(fps: number): number {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError(
      "Animation clip fps must be finite and greater than zero.",
    );
  }
  return fps;
}

function parseUserData(serialized: string): Record<string, unknown> {
  const userData: unknown = JSON.parse(serialized);
  if (!isRecord(userData) || Array.isArray(userData)) {
    throw new TypeError("Animation clip userData must decode to an object.");
  }
  return userData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
