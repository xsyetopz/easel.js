import { Track } from "../Track.ts";

/** Keyframe track for quaternion rotation values - uses spherical linear interpolation (slerp). */
export class QuaternionTrack extends Track {
  constructor(
    name: string,
    times: Float32Array | number[],
    values: Float32Array | number[],
  ) {
    super(name, times, values, 4);
  }

  /** Slerp between quaternion keyframes at index and index+1. */
  override interpolate(
    index: number,
    t0: number,
    t: number,
    t1: number,
  ): number[] {
    const alpha = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    const base0 = index * 4;
    const base1 = (index + 1) * 4;
    const v = this.values;

    let ax = v[base0];
    let ay = v[base0 + 1];
    let az = v[base0 + 2];
    let aw = v[base0 + 3];
    const bx = v[base1];
    const by = v[base1 + 1];
    const bz = v[base1 + 2];
    const bw = v[base1 + 3];

    // Shortest-path correction
    let dot = ax * bx + ay * by + az * bz + aw * bw;
    if (dot < 0) {
      dot = -dot;
      ax = -ax;
      ay = -ay;
      az = -az;
      aw = -aw;
    }

    let scale0: number;
    let scale1: number;
    if (1 - dot > 1e-6) {
      const theta = Math.acos(dot);
      const sinTheta = Math.sin(theta);
      scale0 = Math.sin((1 - alpha) * theta) / sinTheta;
      scale1 = Math.sin(alpha * theta) / sinTheta;
    } else {
      // Fall back to linear lerp for nearly identical quaternions
      scale0 = 1 - alpha;
      scale1 = alpha;
    }

    return [
      scale0 * ax + scale1 * bx,
      scale0 * ay + scale1 * by,
      scale0 * az + scale1 * bz,
      scale0 * aw + scale1 * bw,
    ];
  }
}
