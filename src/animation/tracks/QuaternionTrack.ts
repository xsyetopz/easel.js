import { Interpolation, Track, type TrackOptions } from "../Track.ts";

/** Quaternion rotation keyframes sampled with spherical linear interpolation. */
export class QuaternionTrack extends Track<"quaternion"> {
  /** Runtime label identifying quaternion values and quaternion mixing rules. */
  override get valueType(): "quaternion" {
    return "quaternion";
  }

  /** Creates a four-component quaternion track with linear or discrete interpolation. */
  constructor(
    name: string,
    times: Float32Array | number[],
    values: Float32Array | number[],
    options: Omit<TrackOptions, "itemSize"> = {},
  ) {
    if (
      options.interpolation !== undefined &&
      options.interpolation !== Interpolation.Linear &&
      options.interpolation !== Interpolation.Discrete
    ) {
      throw new RangeError(
        "QuaternionTrack supports only linear or discrete interpolation.",
      );
    }
    super(name, times, values, { ...options, itemSize: 4 });
  }
}
