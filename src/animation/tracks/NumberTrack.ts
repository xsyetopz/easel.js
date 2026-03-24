import { Track } from "../Track.ts";

/** Keyframe track for scalar number values - uses linear interpolation. */
export class NumberTrack extends Track {
	constructor(
		name: string,
		times: Float32Array | number[],
		values: Float32Array | number[],
	) {
		super(name, times, values, 1);
	}
}
