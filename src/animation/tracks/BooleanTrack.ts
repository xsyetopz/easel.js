import { Track } from "../Track.ts";

/** Keyframe track for boolean values - uses step interpolation (no blending). */
export class BooleanTrack extends Track {
	constructor(
		name: string,
		times: Float32Array | number[],
		values: Float32Array | number[],
	) {
		super(name, times, values, 1);
	}

	/** Step interpolation - returns the value at index with no blending. */
	override interpolate(
		index: number,
		_t0: number,
		_t: number,
		_t1: number,
	): number[] {
		return [this.values[index]];
	}
}
