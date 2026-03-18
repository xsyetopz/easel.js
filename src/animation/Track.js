/**
 * Base keyframe track — stores a sequence of timed values and interpolates between them.
 */
export class Track {
	/** @type {string} */
	#name;

	/** @type {Float32Array} */
	#times;

	/** @type {Float32Array} */
	#values;

	/** @type {number} */
	#itemSize;

	/**
	 * @param {string} name - Property path, e.g. "position.x"
	 * @param {Float32Array|number[]} times - Keyframe timestamps
	 * @param {Float32Array|number[]} values - Flat keyframe values (itemSize values per key)
	 * @param {number} [itemSize=1] - Number of values per keyframe
	 */
	constructor(name, times, values, itemSize = 1) {
		this.#name = name;
		this.#times =
			times instanceof Float32Array ? times : new Float32Array(times);
		this.#values =
			values instanceof Float32Array ? values : new Float32Array(values);
		this.#itemSize = itemSize;
	}

	/** @returns {string} */
	get name() {
		return this.#name;
	}

	/** @returns {Float32Array} */
	get times() {
		return this.#times;
	}

	/** @returns {Float32Array} */
	get values() {
		return this.#values;
	}

	/** @returns {number} */
	get itemSize() {
		return this.#itemSize;
	}

	/**
	 * Linear interpolation between keyframes at index and index+1.
	 * @param {number} index - Index of the keyframe just before time t
	 * @param {number} t0 - Time of keyframe at index
	 * @param {number} t - Current time
	 * @param {number} t1 - Time of keyframe at index+1
	 * @returns {number[]} Interpolated values (length = itemSize)
	 */
	interpolate(index, t0, t, t1) {
		const alpha = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
		const result = new Array(this.#itemSize);
		const base0 = index * this.#itemSize;
		const base1 = (index + 1) * this.#itemSize;
		for (let j = 0; j < this.#itemSize; j++) {
			result[j] =
				this.#values[base0 + j] +
				alpha * (this.#values[base1 + j] - this.#values[base0 + j]);
		}
		return result;
	}

	/**
	 * Returns interpolated values at the given time using binary search.
	 * @param {number} time
	 * @returns {number[]} Interpolated values (length = itemSize)
	 */
	getValueAtTime(time) {
		const times = this.#times;
		const n = times.length;

		if (n === 0) return new Array(this.#itemSize).fill(0);
		if (n === 1 || time <= times[0]) {
			const result = new Array(this.#itemSize);
			for (let j = 0; j < this.#itemSize; j++) result[j] = this.#values[j];
			return result;
		}
		if (time >= times[n - 1]) {
			const base = (n - 1) * this.#itemSize;
			const result = new Array(this.#itemSize);
			for (let j = 0; j < this.#itemSize; j++) {
				result[j] = this.#values[base + j];
			}
			return result;
		}

		const index = this.#findKeyframe(time);
		return this.interpolate(index, times[index], time, times[index + 1]);
	}

	/**
	 * Binary search returning index of the keyframe just before time.
	 * @param {number} time
	 * @returns {number}
	 */
	#findKeyframe(time) {
		const times = this.#times;
		let lo = 0;
		let hi = times.length - 1;
		while (lo < hi - 1) {
			const mid = (lo + hi) >> 1;
			if (times[mid] <= time) {
				lo = mid;
			} else {
				hi = mid;
			}
		}
		return lo;
	}
}
