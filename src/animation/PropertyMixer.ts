import type { Binding } from "./Binding.ts";

/** Accumulates weighted property contributions and applies the blended result. */
export class PropertyMixer {
	#binding: Binding;
	#buffer: Float64Array;
	#itemSize: number;
	#cumulativeWeight = 0;

	constructor(binding: Binding, itemSize: number) {
		this.#binding = binding;
		this.#itemSize = itemSize;
		// Slots: [0] accumulation, [1] original state
		this.#buffer = new Float64Array(itemSize * 2);
	}

	/** Adds weighted contribution of interpolated values to the accumulation buffer. */
	accumulate(accuIndex: number, weight: number, values: number[]): void {
		const itemSize = this.#itemSize;
		const offset = accuIndex * itemSize;
		for (let j = 0; j < itemSize; j++) {
			this.#buffer[offset + j] += values[j] * weight;
		}
		this.#cumulativeWeight += weight;
	}

	/** Normalizes accumulated buffer by cumulative weight and writes to property. */
	apply(accuIndex: number): void {
		const itemSize = this.#itemSize;
		const offset = accuIndex * itemSize;
		const w = this.#cumulativeWeight;
		if (w > 0) {
			const normalized = new Array<number>(itemSize);
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

	/** Saves the current property value into the original-state buffer slot. */
	saveOriginalState(): void {
		const itemSize = this.#itemSize;
		const offset = itemSize; // slot 1
		this.#binding.getValue(this.#buffer, offset);
	}

	/** Restores the property value from the saved original-state buffer slot. */
	restoreOriginalState(): void {
		const itemSize = this.#itemSize;
		const offset = itemSize; // slot 1
		const values = Array.from(this.#buffer.subarray(offset, offset + itemSize));
		this.#binding.setValue(values, 0);
	}
}
