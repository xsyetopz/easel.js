import { Track } from "../Track.ts";

/** Keyframe track for vector values - uses linear interpolation per component. */
export class VectorTrack extends Track {
	constructor(
		name: string,
		times: Float32Array | number[],
		values: Float32Array | number[],
		itemSize = 3,
	) {
		super(name, times, values, itemSize);
	}
}
