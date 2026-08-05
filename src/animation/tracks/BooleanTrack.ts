import { DiscreteTrack } from "./DiscreteTrack.ts";

/** Boolean keyframes sampled as discrete values with `itemSize` fixed at one. */
export class BooleanTrack extends DiscreteTrack<boolean> {
  /** Creates a boolean track from strictly ordered times and values. */
  constructor(
    name: string,
    times: Float32Array | readonly number[],
    values: readonly boolean[],
  ) {
    super(name, times, values, "boolean");
  }
}
