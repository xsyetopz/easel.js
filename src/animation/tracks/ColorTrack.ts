import { Track } from "../Track.ts";

/** Keyframe track for RGB color values - uses linear interpolation per channel. */
export class ColorTrack extends Track {
  constructor(
    name: string,
    times: Float32Array | number[],
    values: Float32Array | number[],
  ) {
    super(name, times, values, 3);
  }
}
