import { Track } from "../Track.js";

/**
 * Keyframe track for RGB color values — uses linear interpolation per channel.
 */
export class ColorTrack extends Track {
	/**
	 * @param {string} name - Property path
	 * @param {Float32Array|number[]} times - Keyframe timestamps
	 * @param {Float32Array|number[]} values - Flat keyframe values [r,g,b, r,g,b, ...]
	 */
	constructor(name, times, values) {
		super(name, times, values, 3);
	}
}
