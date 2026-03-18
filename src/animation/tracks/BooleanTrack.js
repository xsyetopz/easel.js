import { Track } from "../Track.js";

/**
 * Keyframe track for boolean values — uses step interpolation (no blending).
 */
export class BooleanTrack extends Track {
	/**
	 * @param {string} name - Property path
	 * @param {Float32Array|number[]} times - Keyframe timestamps
	 * @param {Float32Array|number[]} values - Keyframe values (0 = false, 1 = true)
	 */
	constructor(name, times, values) {
		super(name, times, values, 1);
	}

	/**
	 * Step interpolation — returns the value at index with no blending.
	 * @override
	 * @param {number} index - Index of the keyframe just before time t
	 * @param {number} _t0 - Time of keyframe at index (unused)
	 * @param {number} _t - Current time (unused)
	 * @param {number} _t1 - Time of keyframe at index+1 (unused)
	 * @returns {number[]} Single-element array with the boolean value (0 or 1)
	 */
	interpolate(index, _t0, _t, _t1) {
		return [this.values[index]];
	}
}
