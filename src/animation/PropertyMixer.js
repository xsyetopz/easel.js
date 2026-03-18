import { Binding } from "./Binding.js";

/**
 * Accumulates weighted property contributions and applies the blended result.
 */
export class PropertyMixer {
	/** @type {Binding} */
	#binding;

	/** @type {Float64Array} */
	#buffer;

	/** @type {number} */
	#itemSize;

	/** @type {number} */
	#cumulativeWeight = 0;

	/**
	 * @param {Binding} binding
	 * @param {number} itemSize - Number of values in the property
	 */
	constructor(binding, itemSize) {
		this.#binding = binding;
		this.#itemSize = itemSize;
		// Slots: [0] accumulation, [1] original state
		this.#buffer = new Float64Array(itemSize * 2);
	}

	/**
	 * Reads current property value, adds weighted contribution to accumulation buffer.
	 * @param {number} accuIndex - Buffer slot index (0-based)
	 * @param {number} weight
	 */
	accumulate(accuIndex, weight) {
		const itemSize = this.#itemSize;
		const offset = accuIndex * itemSize;
		const tmp = new Array(itemSize);
		this.#binding.getValue(tmp, 0);
		for (let j = 0; j < itemSize; j++) {
			this.#buffer[offset + j] += tmp[j] * weight;
		}
		this.#cumulativeWeight += weight;
	}

	/**
	 * Normalizes accumulated buffer by cumulative weight and writes to property.
	 * @param {number} accuIndex - Buffer slot index (0-based)
	 */
	apply(accuIndex) {
		const itemSize = this.#itemSize;
		const offset = accuIndex * itemSize;
		const w = this.#cumulativeWeight;
		if (w > 0) {
			const normalized = new Array(itemSize);
			for (let j = 0; j < itemSize; j++) {
				normalized[j] = this.#buffer[offset + j] / w;
			}
			this.#binding.setValue(normalized, 0);
		}
		for (let j = 0; j < itemSize; j++) {
			this.#buffer[offset + j] = 0;
		}
		this.#cumulativeWeight = 0;
	}

	/**
	 * Saves the current property value into the original-state buffer slot.
	 */
	saveOriginalState() {
		const itemSize = this.#itemSize;
		const offset = itemSize; // slot 1
		this.#binding.getValue(this.#buffer, offset);
	}

	/**
	 * Restores the property value from the saved original-state buffer slot.
	 */
	restoreOriginalState() {
		const itemSize = this.#itemSize;
		const offset = itemSize; // slot 1
		const values = Array.from(this.#buffer.subarray(offset, offset + itemSize));
		this.#binding.setValue(values, 0);
	}
}
