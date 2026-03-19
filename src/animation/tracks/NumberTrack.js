import { Track } from "../Track.js";

/**
 * Keyframe track for scalar number values - uses linear interpolation.
 */
export class NumberTrack extends Track {
	/**
	 * @param {string} name - Property path
	 * @param {Float32Array|number[]} times - Keyframe timestamps
	 * @param {Float32Array|number[]} values - Keyframe values
	 */
	constructor(name, times, values) {
		super(name, times, values, 1);
	}
}
