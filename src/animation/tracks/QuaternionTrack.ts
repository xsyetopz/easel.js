import { slerpQuaternionsFlat } from "../../math/Quaternion.ts";
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

  /** Slerps quaternion keyframes at `index` and `index + 1`. */
  override interpolate(
    index: number,
    t0: number,
    t: number,
    t1: number,
  ): number[] {
    if (this.interpolation === Interpolation.Discrete) {
      return Array.from(this.values.subarray(index * 4, index * 4 + 4));
    }
    const alpha = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    const base0 = index * 4;
    const base1 = (index + 1) * 4;
    return slerpQuaternionsFlat(
      [0, 0, 0, 1],
      0,
      this.values,
      base0,
      this.values,
      base1,
      alpha,
    );
  }
}
