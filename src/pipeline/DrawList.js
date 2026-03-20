/** Growable list of DrawCalls collected during scene traversal. */
export class DrawList {
	/** @type {*[]} */
	#calls = [];

	/**
	 * Lights collected during scene traversal.
	 * @type {Array<Record<string, unknown>>}
	 */
	lights = [];

	/** @returns {*[]} */
	get calls() {
		return this.#calls;
	}

	/** @returns {number} */
	get length() {
		return this.#calls.length;
	}

	/**
	 * @param {*} drawCall
	 * @returns {void}
	 */
	add(drawCall) {
		this.#calls.push(drawCall);
	}

	/** @returns {void} */
	clear() {
		this.#calls.length = 0;
	}

	/** @returns {Iterator<*>} */
	[Symbol.iterator]() {
		return this.#calls[Symbol.iterator]();
	}
}
