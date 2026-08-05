import { Track, type TrackOptions } from "../Track.ts";

/** Scalar numeric keyframes with linear interpolation by default. */
export class NumberTrack extends Track {
  /** Creates a numeric track with one scalar value per keyframe. */
  constructor(
    name: string,
    times: Float32Array | number[],
    values: Float32Array | number[],
    options: Omit<TrackOptions, "itemSize"> = {},
  ) {
    super(name, times, values, { ...options, itemSize: 1 });
  }
}
