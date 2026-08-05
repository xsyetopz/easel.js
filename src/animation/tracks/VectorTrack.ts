import { Track, type TrackOptions } from "../Track.ts";

/** Vector keyframes with linear interpolation for each component. */
export class VectorTrack extends Track {
  /** Creates a vector track with the configured component count, defaulting to three. */
  constructor(
    name: string,
    times: Float32Array | number[],
    values: Float32Array | number[],
    options: TrackOptions = { itemSize: 3 },
  ) {
    super(name, times, values, {
      ...options,
      itemSize: options.itemSize ?? 3,
    });
  }
}
