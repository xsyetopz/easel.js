import { DiscreteTrack } from "./DiscreteTrack.ts";

/** String keyframes sampled as immutable discrete values. */
export class StringTrack extends DiscreteTrack<string> {
  /** Creates a string track from strictly ordered times and values. */
  constructor(
    name: string,
    times: Float32Array | readonly number[],
    values: readonly string[],
  ) {
    super(name, times, values, "string");
  }
}
