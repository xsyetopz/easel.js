/**
 * @param {Float32Array} values
 * @param {number} i
 * @param {number} size
 * @returns {boolean}
 */
function _valuesChanged(values, i, size) {
	const base = i * size;
	const prevBase = (i - 1) * size;
	for (let j = 0; j < size; j++) {
		if (values[base + j] !== values[prevBase + j]) return true;
	}
	return false;
}

/**
 * Named collection of keyframe tracks representing a single animation sequence.
 */
export class AnimationClip {
	/** @type {string} */
	#name;

	/** @type {number} */
	#duration;

	/** @type {*[]} */
	#tracks;

	/**
	 * @param {string} [name='']
	 * @param {number} [duration=-1] - Pass -1 to compute from tracks
	 * @param {*[]} [tracks=[]]
	 */
	constructor(name = "", duration = -1, tracks = []) {
		this.#name = name;
		this.#tracks = tracks;
		this.#duration = duration === -1 ? this.#computeDuration() : duration;
	}

	/** @returns {string} */
	get name() {
		return this.#name;
	}

	/** @returns {number} */
	get duration() {
		return this.#duration;
	}

	/** @returns {*[]} */
	get tracks() {
		return this.#tracks;
	}

	/**
	 * Finds a clip by name in an array.
	 * @param {AnimationClip[]} clips
	 * @param {string} name
	 * @returns {AnimationClip|undefined}
	 */
	static findByName(clips, name) {
		for (const clip of clips) {
			if (clip.name === name) return clip;
		}
		return undefined;
	}

	/**
	 * Recomputes duration from the maximum keyframe time across all tracks.
	 */
	resetDuration() {
		this.#duration = this.#computeDuration();
	}

	/**
	 * Removes keyframes outside [0, duration] from all tracks.
	 */
	trim() {
		const dur = this.#duration;
		for (const track of this.#tracks) {
			const times = track.times;
			const size = track.itemSize;
			let end = times.length;
			while (end > 0 && times[end - 1] > dur) end--;
			if (end < times.length) {
				track.times.fill(0, end);
				track.values.fill(0, end * size);
			}
		}
	}

	/**
	 * Removes redundant keyframes where the value does not change from the previous key.
	 */
	optimize() {
		for (const track of this.#tracks) {
			const times = track.times;
			const values = track.values;
			const size = track.itemSize;
			const keepTimes = [times[0]];
			const keepValues = Array.from(values.subarray(0, size));

			for (let i = 1; i < times.length; i++) {
				if (_valuesChanged(values, i, size)) {
					keepTimes.push(times[i]);
					const base = i * size;
					for (let j = 0; j < size; j++) keepValues.push(values[base + j]);
				}
			}

			const newTimes = new Float32Array(keepTimes);
			const newValues = new Float32Array(keepValues);
			times.set(newTimes.subarray(0, Math.min(newTimes.length, times.length)));
			values.set(
				newValues.subarray(0, Math.min(newValues.length, values.length)),
			);
		}
	}

	/**
	 * @returns {number}
	 */
	#computeDuration() {
		let max = 0;
		for (const track of this.#tracks) {
			const t = track.times;
			if (t.length > 0 && t[t.length - 1] > max) max = t[t.length - 1];
		}
		return max;
	}
}
