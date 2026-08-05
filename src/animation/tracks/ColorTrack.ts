import { Track, type TrackOptions } from "../Track.ts";

/** RGB keyframes with linear interpolation for each of the three channels. */
export class ColorTrack extends Track {
  /** Creates an RGB track; `itemSize` is fixed at three components. */
  constructor(
    name: string,
    times: Float32Array | number[],
    values: Float32Array | number[],
    options: Omit<TrackOptions, "itemSize"> = {},
  ) {
    super(name, times, values, { ...options, itemSize: 3 });
  }
}
