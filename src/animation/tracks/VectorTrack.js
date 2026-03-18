import { Track } from "../Track.js";

/**
 * Keyframe track for vector values — uses linear interpolation per component.
 */
export class VectorTrack extends Track {
	/**
	 * @param {string} name - Property path
	 * @param {Float32Array|number[]} times - Keyframe timestamps
	 * @param {Float32Array|number[]} values - Flat keyframe values
	 * @param {number} [itemSize=3] - Number of components per keyframe (2, 3, or 4)
	 */
	constructor(name, times, values, itemSize = 3) {
		super(name, times, values, itemSize);
	}
}
